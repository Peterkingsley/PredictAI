from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from api.config import get_settings
from api.services.fast_trading import (
    DEFAULT_DAILY_LIMIT_USDC,
    DEFAULT_MAX_ORDER_USDC,
    build_fast_trading_message,
    default_fast_trading_expiry,
    verify_fast_trading_signature,
)
from api.services.wallets import get_usdc_balance, is_evm_address
from api.services.wallets import short_address
from db.crud import (
    add_wallet,
    get_fast_trading_authorization,
    list_wallets as list_user_wallets,
    revoke_fast_trading_authorization,
    upsert_fast_trading_authorization,
)
from db.models import SessionLocal

router = APIRouter()


class WalletConnectRequest(BaseModel):
    telegram_id: int
    address: str
    connection_message: str | None = None
    connection_signature: str | None = None


class FastTradingPrepareRequest(BaseModel):
    telegram_id: int
    wallet_address: str
    max_order_usdc: float = DEFAULT_MAX_ORDER_USDC
    daily_limit_usdc: float = DEFAULT_DAILY_LIMIT_USDC


class FastTradingAuthorizeRequest(FastTradingPrepareRequest):
    message: str
    signature: str
    expires_at: str


@router.post("/connect")
async def connect_wallet(request: WalletConnectRequest):
    if not is_evm_address(request.address):
        return {"status": "rejected", "message": "Invalid EVM address"}

    async with SessionLocal() as session:
        wallet = await add_wallet(session, request.telegram_id, request.address)
    balance = await get_usdc_balance(wallet.address)
    await _notify_telegram_wallet_connected(
        request.telegram_id,
        wallet.address,
        balance,
        bool(request.connection_signature),
    )
    return {
        "status": "connected",
        "telegram_id": request.telegram_id,
        "address": wallet.address,
        "balance_usdc": balance,
        "connection_signature_received": bool(request.connection_signature),
    }


@router.get("/fast-trading/status/{telegram_id}")
async def fast_trading_status(telegram_id: int):
    async with SessionLocal() as session:
        authorization = await get_fast_trading_authorization(session, telegram_id)
    return _fast_trading_status_dict(telegram_id, authorization)


@router.post("/fast-trading/prepare")
async def prepare_fast_trading(request: FastTradingPrepareRequest):
    if not is_evm_address(request.wallet_address):
        raise HTTPException(status_code=400, detail="Invalid EVM address")
    expires_at = default_fast_trading_expiry()
    message = build_fast_trading_message(
        telegram_id=request.telegram_id,
        wallet_address=request.wallet_address,
        max_order_usdc=request.max_order_usdc,
        daily_limit_usdc=request.daily_limit_usdc,
        expires_at=expires_at,
    )
    return {
        "status": "ready_for_signature",
        "message": message,
        "expires_at": expires_at.isoformat(),
        "max_order_usdc": request.max_order_usdc,
        "daily_limit_usdc": request.daily_limit_usdc,
    }


@router.post("/fast-trading/authorize")
async def authorize_fast_trading(request: FastTradingAuthorizeRequest):
    try:
        expires_at = datetime.fromisoformat(request.expires_at.replace("Z", ""))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid fast trading expiry.") from exc
    expected_message = build_fast_trading_message(
        telegram_id=request.telegram_id,
        wallet_address=request.wallet_address,
        max_order_usdc=request.max_order_usdc,
        daily_limit_usdc=request.daily_limit_usdc,
        expires_at=expires_at,
    )
    if request.message != expected_message:
        raise HTTPException(status_code=400, detail="Fast trading authorization message does not match the requested limits.")
    verification = verify_fast_trading_signature(request.wallet_address, expected_message, request.signature)
    if not verification["verified"]:
        raise HTTPException(status_code=400, detail=verification["message"])
    async with SessionLocal() as session:
        authorization = await upsert_fast_trading_authorization(
            session,
            telegram_id=request.telegram_id,
            wallet_address=request.wallet_address,
            max_order_usdc=request.max_order_usdc,
            daily_limit_usdc=request.daily_limit_usdc,
            expires_at=expires_at,
            authorization_message=expected_message,
            authorization_signature=request.signature,
            metadata={"recovered_address": verification["recovered_address"]},
        )
    await _notify_telegram_fast_trading_authorized(
        request.telegram_id,
        authorization.wallet_address,
        float(authorization.max_order_usdc),
        float(authorization.daily_limit_usdc),
    )
    return {
        **_fast_trading_status_dict(request.telegram_id, authorization),
        "signature_verified": True,
        "recovered_address": verification["recovered_address"],
    }


@router.post("/fast-trading/disable/{telegram_id}")
async def disable_fast_trading(telegram_id: int):
    async with SessionLocal() as session:
        revoked = await revoke_fast_trading_authorization(session, telegram_id)
    return {"telegram_id": telegram_id, "status": "disabled" if revoked else "not_enabled"}


@router.get("/list/{telegram_id}")
async def list_wallets(telegram_id: int):
    async with SessionLocal() as session:
        wallets = await list_user_wallets(session, telegram_id)
    return {
        "telegram_id": telegram_id,
        "wallets": [
            {"address": wallet.address, "is_active": wallet.is_active, "connected_at": wallet.connected_at.isoformat()}
            for wallet in wallets
        ],
    }


def _fast_trading_status_dict(telegram_id: int, authorization) -> dict:
    if not authorization:
        return {"telegram_id": telegram_id, "enabled": False, "status": "not_enabled"}
    return {
        "telegram_id": telegram_id,
        "enabled": True,
        "status": authorization.status.lower(),
        "wallet_address": authorization.wallet_address,
        "max_order_usdc": float(authorization.max_order_usdc),
        "daily_limit_usdc": float(authorization.daily_limit_usdc),
        "expires_at": authorization.expires_at.isoformat() if authorization.expires_at else None,
        "created_at": authorization.created_at.isoformat() if authorization.created_at else None,
    }


async def _notify_telegram_wallet_connected(
    telegram_id: int,
    address: str,
    balance: float | None,
    has_signature: bool,
) -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return

    proof_text = "Connection signature received." if has_signature else "Connection signature missing."
    balance_text = f"\n\nUSDC balance: {balance:.2f}" if balance is not None else ""
    text = f"Wallet connected\n{short_address(address)}\n{proof_text}{balance_text}\n\nTry /markets or /wallets."

    api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(api_url, json={"chat_id": telegram_id, "text": text})


async def _notify_telegram_fast_trading_authorized(
    telegram_id: int,
    address: str,
    max_order_usdc: float,
    daily_limit_usdc: float,
) -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return

    text = (
        "Fast trading authorization enabled\n"
        "----------------------------------\n"
        f"Wallet: {short_address(address)}\n"
        f"Max order: {max_order_usdc:.2f} USDC\n"
        f"Daily limit: {daily_limit_usdc:.2f} USDC\n\n"
        "PredictAI will still ask for Telegram confirmation before any order."
    )

    api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(api_url, json={"chat_id": telegram_id, "text": text})
