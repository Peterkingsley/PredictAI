from fastapi import APIRouter
from pydantic import BaseModel
import httpx

from api.config import get_settings
from api.services.wallets import get_usdc_balance, is_evm_address
from api.services.wallets import short_address
from db.crud import add_wallet, list_wallets as list_user_wallets
from db.models import SessionLocal

router = APIRouter()


class WalletConnectRequest(BaseModel):
    telegram_id: int
    address: str
    connection_message: str | None = None
    connection_signature: str | None = None


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
