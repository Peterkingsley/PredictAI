from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.config import get_settings
from api.services.order_submission import OrderSubmissionError, PolymarketOrderSubmissionService
from api.services.wallets import POLYGON_USDC, get_usdc_allowance, short_address
from db.crud import (
    complete_signing_intent,
    create_signing_intent,
    finalize_signing_intent,
    get_signing_intent_for_trade_order,
    get_signing_intent,
    get_trade_order,
    list_syncable_trade_orders,
    list_open_positions,
    list_positions,
    list_trade_orders,
    update_trade_order_cancellation,
    update_trade_order_retry,
    update_trade_order_sync,
    update_signing_intent_submission,
    upsert_position_from_trade_order,
    upsert_trade_order_from_intent,
)
from db.models import SessionLocal

router = APIRouter()
RETRYABLE_ORDER_STATUSES = {"SIGNED", "SIGNED_PENDING_SUBMISSION", "FAILED", "CONFIGURATION_MISSING"}


class BuildOrderRequest(BaseModel):
    telegram_id: int
    market_id: str
    side: Literal["YES", "NO"]
    amount_usdc: float = Field(gt=0)
    wallet_address: str


class SigningIntentRequest(BaseModel):
    telegram_id: int
    wallet_address: str
    intent_type: Literal["BUY", "SELL"]
    payload: dict


class CompleteSigningIntentRequest(BaseModel):
    signature: str
    typed_data: dict | None = None


class TransactionFinalizedRequest(BaseModel):
    intent_id: int
    tx_hash: str
    status: Literal["CONFIRMED", "FAILED"] = "CONFIRMED"
    explorer_url: str | None = None


@router.post("/build")
async def build_order(request: BuildOrderRequest):
    return {
        "status": "signing_required",
        "message": "Create a signing intent and complete wallet approval before Polymarket submission.",
        "request": request.model_dump(),
    }


@router.get("/readiness")
async def trading_readiness():
    return PolymarketOrderSubmissionService().readiness_report()


@router.post("/signing-intents")
async def signing_intent(request: SigningIntentRequest):
    async with SessionLocal() as session:
        intent = await create_signing_intent(
            session,
            telegram_id=request.telegram_id,
            wallet_address=request.wallet_address,
            intent_type=request.intent_type,
            payload=request.payload,
        )
    return {
        "id": intent.id,
        "status": intent.status,
        "intent_type": intent.intent_type,
        "wallet_address": intent.wallet_address,
        "payload": intent.payload,
    }


@router.get("/signing-intents/{intent_id}")
async def get_intent(intent_id: int):
    async with SessionLocal() as session:
        intent = await get_signing_intent(session, intent_id)
    if not intent:
        return {"status": "not_found"}
    approval = await _approval_requirements(intent)
    return {
        "id": intent.id,
        "telegram_id": intent.telegram_id,
        "wallet_address": intent.wallet_address,
        "intent_type": intent.intent_type,
        "payload": intent.payload,
        "approval": approval,
        "status": intent.status,
    }


@router.post("/signing-intents/{intent_id}/complete")
async def complete_intent(intent_id: int, request: CompleteSigningIntentRequest):
    async with SessionLocal() as session:
        intent_to_verify = await get_signing_intent(session, intent_id)
        if not intent_to_verify:
            return {"status": "not_found"}
        verification = _verify_typed_data_signature(intent_to_verify, request.signature, request.typed_data)
        if not verification["verified"]:
            raise HTTPException(status_code=400, detail=verification["message"])
        intent = await complete_signing_intent(session, intent_id, request.signature)
        submission = _submit_verified_order_intent(intent)
        intent = await update_signing_intent_submission(
            session,
            intent.id,
            submission,
            status="ORDER_SUBMITTED" if submission["status"] == "submitted" else None,
        )
        order = await upsert_trade_order_from_intent(session, intent, submission)
    await _notify_telegram_signature_received(intent.telegram_id, intent, order)
    return {
        "id": intent.id,
        "status": intent.status,
        "signature_verified": True,
        "recovered_address": verification["recovered_address"],
        "order_submission": submission,
        "trade_order_id": order.id if order else None,
        "telegram_notified": bool(get_settings().telegram_bot_token),
    }


@router.post("/webhooks/transaction-finalized")
async def transaction_finalized(request: TransactionFinalizedRequest):
    async with SessionLocal() as session:
        intent = await finalize_signing_intent(session, request.intent_id, request.tx_hash, request.status)
    if not intent:
        return {"status": "not_found"}

    await _notify_telegram_transaction(intent.telegram_id, intent.id, request)
    return {
        "id": intent.id,
        "status": intent.status,
        "telegram_notified": bool(get_settings().telegram_bot_token),
    }


@router.get("/positions/{telegram_id}")
async def positions(telegram_id: int):
    async with SessionLocal() as session:
        open_positions = await list_open_positions(session, telegram_id)
    return {
        "telegram_id": telegram_id,
        "positions": [
            {
                "id": position.id,
                "market_id": position.market_id,
                "market_question": position.market_question,
                "side": position.side,
                "amount_usdc": float(position.amount_usdc),
                "shares": float(position.shares),
                "entry_price": float(position.entry_price),
                "current_price": float(position.current_price or position.entry_price),
                "status": position.status,
            }
            for position in open_positions
        ],
    }


@router.get("/history/{telegram_id}")
async def history(telegram_id: int):
    async with SessionLocal() as session:
        positions = await list_positions(session, telegram_id)
    return {
        "telegram_id": telegram_id,
        "positions": [
            {
                "id": position.id,
                "market_question": position.market_question,
                "side": position.side,
                "amount_usdc": float(position.amount_usdc),
                "status": position.status,
                "opened_at": position.opened_at.isoformat() if position.opened_at else None,
                "closed_at": position.closed_at.isoformat() if position.closed_at else None,
            }
            for position in positions
        ],
    }


@router.get("/orders/{telegram_id}")
async def orders(telegram_id: int, limit: int = 10):
    async with SessionLocal() as session:
        trade_orders = await list_trade_orders(session, telegram_id, limit=limit)
    return {
        "telegram_id": telegram_id,
        "orders": [_trade_order_dict(order) for order in trade_orders],
    }


@router.post("/orders/{telegram_id}/sync")
async def sync_orders(telegram_id: int, limit: int = 25):
    synced = []
    errors = []
    service = PolymarketOrderSubmissionService()
    async with SessionLocal() as session:
        trade_orders = await list_syncable_trade_orders(session, telegram_id=telegram_id, limit=limit)
        for order in trade_orders:
            try:
                remote = service.fetch_order_status(order.polymarket_order_id)
                updated = await update_trade_order_sync(
                    session,
                    order,
                    remote_status=remote["status"],
                    remote_response=remote["raw_response"],
                )
                await upsert_position_from_trade_order(session, updated)
                synced.append(_trade_order_dict(updated))
            except OrderSubmissionError as exc:
                errors.append({"id": order.id, "message": str(exc)})
    return {
        "telegram_id": telegram_id,
        "synced_count": len(synced),
        "error_count": len(errors),
        "orders": synced,
        "errors": errors,
    }


@router.post("/orders/{telegram_id}/{order_id}/cancel")
async def cancel_order(telegram_id: int, order_id: int):
    service = PolymarketOrderSubmissionService()
    async with SessionLocal() as session:
        order = await get_trade_order(session, telegram_id, order_id)
        if not order:
            return {"status": "not_found"}
        if order.status not in {"SUBMITTED", "OPEN", "PARTIALLY_FILLED"}:
            return {"status": "not_cancellable", "order": _trade_order_dict(order)}
        try:
            cancellation = service.cancel_order(order.polymarket_order_id)
            updated = await update_trade_order_cancellation(session, order, cancellation["raw_response"])
        except OrderSubmissionError as exc:
            return {"status": "failed", "message": str(exc), "order": _trade_order_dict(order)}
    return {"status": "cancelled", "order": _trade_order_dict(updated)}


@router.post("/orders/{telegram_id}/{order_id}/retry")
async def retry_order(telegram_id: int, order_id: int):
    async with SessionLocal() as session:
        result = await get_signing_intent_for_trade_order(session, telegram_id, order_id)
        if not result:
            return {"status": "not_found"}
        order, intent = result
        if order.status not in RETRYABLE_ORDER_STATUSES:
            return {"status": "not_retryable", "order": _trade_order_dict(order)}
        if not intent.signature:
            return {"status": "signature_missing", "order": _trade_order_dict(order)}
        submission = _submit_verified_order_intent(intent)
        updated = await update_trade_order_retry(session, intent, order, submission)
    return {
        "status": "retried",
        "order_submission": submission,
        "order": _trade_order_dict(updated),
    }


@router.get("/orders/{telegram_id}/{order_id}")
async def order_detail(telegram_id: int, order_id: int):
    async with SessionLocal() as session:
        order = await get_trade_order(session, telegram_id, order_id)
    if not order:
        return {"status": "not_found"}
    return _trade_order_dict(order)


async def _notify_telegram_transaction(telegram_id: int, intent_id: int, request: TransactionFinalizedRequest) -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return

    if request.status == "CONFIRMED":
        text = (
            "Transaction confirmed\n"
            "---------------------\n"
            f"Signing request #{intent_id}\n"
            f"Tx: {short_address(request.tx_hash)}"
        )
    else:
        text = (
            "Transaction failed\n"
            "------------------\n"
            f"Signing request #{intent_id}\n"
            f"Tx: {short_address(request.tx_hash)}"
        )

    if request.explorer_url:
        text = f"{text}\n{request.explorer_url}"

    api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(api_url, json={"chat_id": telegram_id, "text": text})


async def _notify_telegram_signature_received(telegram_id: int, intent, order=None) -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return

    payload = intent.payload or {}
    submission = payload.get("order_submission") or {}
    amount = payload.get("amount_usdc")
    price = payload.get("entry_price")
    shares = payload.get("shares")
    side = payload.get("side", intent.intent_type)
    question = payload.get("market_question", "Selected market")
    amount_text = f"{float(amount):.2f} USDC " if amount is not None else ""
    if submission.get("status") == "submitted":
        lifecycle = "Submitted"
        next_action = "Sync orders to confirm whether it is open or filled."
    elif submission.get("status") == "failed":
        lifecycle = "Failed"
        next_action = "Open Status, fix the issue, then retry from Orders."
    elif submission.get("status") == "configuration_missing":
        lifecycle = "Configuration missing"
        next_action = "Open Status, complete missing config, then retry from Orders."
    elif submission.get("status") == "disabled":
        lifecycle = "Signed - live submission paused"
        next_action = "Enable live submission when ready, then retry from Orders."
    else:
        lifecycle = "Signed"
        next_action = "Open Orders for the latest status."
    text = (
        "Signature received\n"
        "------------------\n"
        f"Signing request #{intent.id}\n"
        f"Order: #{order.id if order else '-'}\n"
        f"Lifecycle: {lifecycle}\n"
        f"{question}\n\n"
        f"Side: {side}\n"
        f"Amount: {amount_text.strip() or '-'}\n"
        f"Price: {_format_price(price)}\n"
        f"Shares: {_format_number(shares)}\n"
        f"Wallet: {short_address(intent.wallet_address)}\n"
        f"Polymarket order: {submission.get('order_id') or '-'}\n\n"
        f"Submission: {submission.get('message', '-')}\n"
        f"Next: {next_action}"
    )

    api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    buttons = [
        [
            {"text": "View orders", "callback_data": "orders"},
            {"text": "Sync orders", "callback_data": "order_sync_all"},
        ],
        [
            {"text": "Back to market", "callback_data": "market:selected"},
            {"text": "Home", "callback_data": "home"},
        ],
    ]
    if order and order.status in RETRYABLE_ORDER_STATUSES:
        buttons.insert(0, [{"text": "Retry submission", "callback_data": f"order_retry:{order.id}"}])
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(api_url, json={"chat_id": telegram_id, "text": text, "reply_markup": {"inline_keyboard": buttons}})


def _format_price(value) -> str:
    if value is None:
        return "-"
    return f"${float(value):.4f}"


def _format_number(value) -> str:
    if value is None:
        return "-"
    return f"{float(value):.2f}"


def _verify_typed_data_signature(intent, signature: str, submitted_typed_data: dict | None = None) -> dict:
    typed_data = (intent.payload or {}).get("typed_data")
    if not typed_data:
        return {"verified": False, "message": "This signing intent is missing typed-data payload.", "recovered_address": None}
    if submitted_typed_data and submitted_typed_data != typed_data:
        return {"verified": False, "message": "Submitted typed-data does not match the server intent.", "recovered_address": None}

    try:
        from eth_account import Account
        from eth_account.messages import encode_typed_data
    except ImportError as exc:
        return {"verified": False, "message": f"Signature verification dependency is missing: {exc}", "recovered_address": None}

    try:
        signable = encode_typed_data(full_message=typed_data)
        recovered_address = Account.recover_message(signable, signature=signature)
    except Exception as exc:
        return {"verified": False, "message": f"Unable to recover signer from typed-data signature: {exc}", "recovered_address": None}

    expected_address = str(intent.wallet_address or "").lower()
    if recovered_address.lower() != expected_address:
        return {
            "verified": False,
            "message": f"Signature was created by {short_address(recovered_address)}, not {short_address(expected_address)}.",
            "recovered_address": recovered_address,
        }
    return {"verified": True, "message": "Signature verified.", "recovered_address": recovered_address}


def _submit_verified_order_intent(intent) -> dict:
    try:
        return PolymarketOrderSubmissionService().submit_verified_intent(intent).as_dict()
    except OrderSubmissionError as exc:
        return {
            "status": "failed",
            "message": str(exc),
            "order_id": None,
            "raw_response": None,
        }


async def _approval_requirements(intent) -> dict:
    settings = get_settings()
    payload = intent.payload or {}
    amount = float(payload.get("amount_usdc") or 0)
    spender = settings.polymarket_usdc_spender
    allowance = None
    if spender and amount > 0:
        try:
            allowance = await get_usdc_allowance(intent.wallet_address, spender)
        except Exception:
            allowance = None
    return {
        "token_address": POLYGON_USDC,
        "spender": spender,
        "required_usdc": amount,
        "current_allowance_usdc": allowance,
        "needs_approval": bool(spender and amount > 0 and (allowance is None or allowance < amount)),
        "can_check_allowance": allowance is not None,
    }


def _trade_order_dict(order) -> dict:
    return {
        "id": order.id,
        "signing_intent_id": order.signing_intent_id,
        "wallet_address": order.wallet_address,
        "market_id": order.market_id,
        "market_question": order.market_question,
        "outcome_token_id": order.outcome_token_id,
        "side": order.side,
        "order_type": order.order_type,
        "amount_usdc": float(order.amount_usdc),
        "shares": float(order.shares),
        "limit_price": float(order.limit_price),
        "status": order.status,
        "polymarket_order_id": order.polymarket_order_id,
        "submission": order.submission,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "retryable": order.status in RETRYABLE_ORDER_STATUSES,
    }
