from __future__ import annotations

from typing import Any

from api.config import get_settings
from api.services.order_submission import OrderSubmissionError, PolymarketOrderSubmissionService
from api.services.wallets import POLYGON_USDC, get_usdc_allowance, short_address

RETRYABLE_ORDER_STATUSES = {"SIGNED", "SIGNED_PENDING_SUBMISSION", "FAILED", "CONFIGURATION_MISSING"}


def verify_typed_data_signature(intent, signature: str, submitted_typed_data: dict | None = None) -> dict:
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


def submit_verified_order_intent(intent) -> dict:
    try:
        return PolymarketOrderSubmissionService().submit_verified_intent(intent).as_dict()
    except OrderSubmissionError as exc:
        return {
            "status": "failed",
            "message": str(exc),
            "order_id": None,
            "raw_response": None,
        }


async def approval_requirements(intent) -> dict:
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


def trade_order_dict(order) -> dict[str, Any]:
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
