from typing import Literal

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from api.config import get_settings
from api.services.wallets import short_address
from db.crud import (
    complete_signing_intent,
    create_signing_intent,
    finalize_signing_intent,
    get_signing_intent,
    list_open_positions,
    list_positions,
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


class TransactionFinalizedRequest(BaseModel):
    intent_id: int
    tx_hash: str
    status: Literal["CONFIRMED", "FAILED"] = "CONFIRMED"
    explorer_url: str | None = None


@router.post("/build")
async def build_order(request: BuildOrderRequest):
    return {
        "status": "not_enabled",
        "message": "Real trade construction is intentionally disabled until wallet signing is validated.",
        "request": request.model_dump(),
    }


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
        intent = await complete_signing_intent(session, intent_id, request.signature)
    if not intent:
        return {"status": "not_found"}
    return {"id": intent.id, "status": intent.status}


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
