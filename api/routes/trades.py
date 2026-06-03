from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.config import get_settings
from api.services.order_submission import OrderSubmissionError, PolymarketOrderSubmissionService
from api.services.wallets import short_address
from db.crud import (
    complete_signing_intent,
    create_signing_intent,
    finalize_signing_intent,
    get_signing_intent,
    list_open_positions,
    list_positions,
    update_signing_intent_submission,
)
from db.models import SessionLocal

router = APIRouter()


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
    return {
        "id": intent.id,
        "telegram_id": intent.telegram_id,
        "wallet_address": intent.wallet_address,
        "intent_type": intent.intent_type,
        "payload": intent.payload,
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
    await _notify_telegram_signature_received(intent.telegram_id, intent)
    return {
        "id": intent.id,
        "status": intent.status,
        "signature_verified": True,
        "recovered_address": verification["recovered_address"],
        "order_submission": submission,
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


async def _notify_telegram_signature_received(telegram_id: int, intent) -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return

    payload = intent.payload or {}
    submission = payload.get("order_submission") or {}
    amount = payload.get("amount_usdc")
    side = payload.get("side", intent.intent_type)
    question = payload.get("market_question", "Selected market")
    amount_text = f"{float(amount):.2f} USDC " if amount is not None else ""
    if submission.get("status") == "submitted":
        order_status = f"Order submitted to Polymarket CLOB.\nOrder: {submission.get('order_id') or 'pending ID'}"
    elif submission.get("status") == "failed":
        order_status = f"Order submission failed: {submission.get('message')}"
    else:
        order_status = f"Order submission queued: {submission.get('message', 'live submission is not enabled yet.')}"
    text = (
        "Wallet signature received\n"
        "-------------------------\n"
        f"Signing request #{intent.id}\n"
        f"{amount_text}{side}\n"
        f"{question}\n\n"
        f"{order_status}"
    )

    api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(api_url, json={"chat_id": telegram_id, "text": text})


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
