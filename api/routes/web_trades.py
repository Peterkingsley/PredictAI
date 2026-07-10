from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.services.auth import get_current_user_id
from api.services.order_intent import build_order_intent_typed_data, pre_trade_validation, token_id_for_side
from api.services.polymarket import PolymarketService
from api.services.signing import (
    RETRYABLE_ORDER_STATUSES,
    approval_requirements,
    submit_verified_order_intent,
    trade_order_dict,
    verify_typed_data_signature,
)
from db.crud import (
    create_signing_intent_for_user,
    get_signing_intent,
    get_trade_order_for_user,
    list_open_positions_for_user,
    list_trade_orders_for_user,
    upsert_trade_order_from_intent_for_user,
)
from db.models import SessionLocal

router = APIRouter()
service = PolymarketService()


class PrepareOrderRequest(BaseModel):
    market_id: str
    side: Literal["YES", "NO"]
    amount_usdc: float = Field(gt=0)
    wallet_address: str


class CompleteSigningIntentRequest(BaseModel):
    signature: str
    typed_data: dict | None = None


@router.post("/signing-intents")
async def prepare_order(request: PrepareOrderRequest, user_id: int = Depends(get_current_user_id)):
    market = await service.get_market(request.market_id)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found.")

    price = market["yes_price"] if request.side == "YES" else market["no_price"]
    price = max(float(price or 0), 0.01)
    shares = request.amount_usdc / price

    validation_errors = await pre_trade_validation(
        market=market,
        side=request.side,
        amount=request.amount_usdc,
        shares=shares,
        wallet_address=request.wallet_address,
    )
    if validation_errors:
        raise HTTPException(status_code=400, detail="; ".join(validation_errors))

    base_payload = {
        "market_id": market["id"],
        "market_question": market["question"],
        "side": request.side,
        "amount_usdc": request.amount_usdc,
        "shares": shares,
        "entry_price": price,
        "wallet_address": request.wallet_address,
        "outcome_token_id": token_id_for_side(market, request.side),
        "source": "web",
    }

    async with SessionLocal() as session:
        intent = await create_signing_intent_for_user(
            session,
            user_id=user_id,
            wallet_address=request.wallet_address,
            intent_type="BUY",
            payload={
                **base_payload,
                "signature_kind": "predictai_eip712_order_intent",
            },
        )
        intent.payload = {
            **intent.payload,
            "typed_data": build_order_intent_typed_data(intent.id, base_payload),
        }
        session.add(intent)
        await session.commit()
        await session.refresh(intent)

    return await _intent_dict(intent, user_id)


@router.get("/signing-intents/{intent_id}")
async def get_intent(intent_id: int, user_id: int = Depends(get_current_user_id)):
    async with SessionLocal() as session:
        intent = await get_signing_intent(session, intent_id)
    if not intent or intent.user_id != user_id:
        raise HTTPException(status_code=404, detail="Signing intent not found.")
    return await _intent_dict(intent, user_id)


@router.post("/signing-intents/{intent_id}/complete")
async def complete_intent(intent_id: int, request: CompleteSigningIntentRequest, user_id: int = Depends(get_current_user_id)):
    async with SessionLocal() as session:
        intent = await get_signing_intent(session, intent_id)
        if not intent or intent.user_id != user_id:
            raise HTTPException(status_code=404, detail="Signing intent not found.")
        verification = verify_typed_data_signature(intent, request.signature, request.typed_data)
        if not verification["verified"]:
            raise HTTPException(status_code=400, detail=verification["message"])

        intent.status = "SIGNED"
        intent.signature = request.signature
        intent.payload = {
            **(intent.payload or {}),
            "signature_verified": True,
        }
        session.add(intent)
        await session.commit()
        await session.refresh(intent)

        submission = submit_verified_order_intent(intent)
        intent.payload = {**(intent.payload or {}), "order_submission": submission}
        if submission["status"] == "submitted":
            intent.status = "ORDER_SUBMITTED"
        session.add(intent)
        await session.commit()
        await session.refresh(intent)

        order = await upsert_trade_order_from_intent_for_user(session, intent, submission)

    return {
        "id": intent.id,
        "status": intent.status,
        "signature_verified": True,
        "order_submission": submission,
        "trade_order_id": order.id if order else None,
    }


@router.get("/orders")
async def orders(user_id: int = Depends(get_current_user_id), limit: int = 20):
    async with SessionLocal() as session:
        trade_orders = await list_trade_orders_for_user(session, user_id, limit=limit)
    return {"orders": [trade_order_dict(order) for order in trade_orders]}


@router.get("/orders/{order_id}")
async def order_detail(order_id: int, user_id: int = Depends(get_current_user_id)):
    async with SessionLocal() as session:
        order = await get_trade_order_for_user(session, user_id, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return trade_order_dict(order)


@router.get("/positions")
async def positions(user_id: int = Depends(get_current_user_id)):
    async with SessionLocal() as session:
        open_positions = await list_open_positions_for_user(session, user_id)
    return {
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
        ]
    }


async def _intent_dict(intent, user_id: int) -> dict:
    approval = await approval_requirements(intent)
    return {
        "id": intent.id,
        "wallet_address": intent.wallet_address,
        "intent_type": intent.intent_type,
        "payload": intent.payload,
        "approval": approval,
        "status": intent.status,
        "retryable": intent.status in RETRYABLE_ORDER_STATUSES,
    }
