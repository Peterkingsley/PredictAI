from __future__ import annotations

from typing import Any

from api.config import get_settings
from api.services.order_submission import PolymarketOrderSubmissionService
from api.services.wallets import get_usdc_balance, is_evm_address


def token_id_for_side(market: dict, side: str) -> str | None:
    if side == "YES":
        return market.get("yes_token_id")
    return market.get("no_token_id")


async def pre_trade_validation(
    market: dict,
    side: str,
    amount: float,
    shares: float,
    wallet_address: str,
) -> list[str]:
    settings = get_settings()
    errors = []
    readiness = PolymarketOrderSubmissionService().readiness_report()
    if not readiness["ready"]:
        errors.append(readiness["message"])
    if not market.get("active", True):
        errors.append("Market is not active.")
    if not token_id_for_side(market, side):
        errors.append(f"{side} outcome token is missing.")
    min_order_size = max(float(settings.min_bet_usdc), float(market.get("min_order_size") or 0))
    if amount < min_order_size:
        errors.append(f"Minimum order size is {min_order_size:.2f} USDC.")
    if amount <= 0 or shares <= 0:
        errors.append("Order amount and shares must be greater than zero.")
    try:
        balance = await get_usdc_balance(wallet_address)
    except Exception:
        balance = None
    if balance is not None and balance < amount:
        errors.append(f"Wallet USDC balance is {balance:.2f}, below {amount:.2f} USDC.")
    spender = settings.polymarket_usdc_spender
    if readiness["ready"]:
        if not spender:
            errors.append("POLYMARKET_USDC_SPENDER is not configured, so USDC allowance cannot be verified.")
        elif not is_evm_address(spender):
            errors.append("Configured POLYMARKET_USDC_SPENDER is not a valid EVM address.")
    return errors


def build_order_intent_typed_data(intent_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
            ],
            "PredictAIOrderIntent": [
                {"name": "intentId", "type": "uint256"},
                {"name": "wallet", "type": "address"},
                {"name": "marketId", "type": "string"},
                {"name": "side", "type": "string"},
                {"name": "amountUsdcMicro", "type": "uint256"},
                {"name": "limitPriceBps", "type": "uint256"},
                {"name": "sharesMicro", "type": "uint256"},
            ],
        },
        "primaryType": "PredictAIOrderIntent",
        "domain": {
            "name": "PredictAI",
            "version": "1",
            "chainId": get_settings().polygon_chain_id,
        },
        "message": {
            "intentId": intent_id,
            "wallet": payload["wallet_address"],
            "marketId": str(payload["market_id"]),
            "side": payload["side"],
            "amountUsdcMicro": round(float(payload["amount_usdc"]) * 1_000_000),
            "limitPriceBps": round(float(payload["entry_price"]) * 10_000),
            "sharesMicro": round(float(payload["shares"]) * 1_000_000),
        },
    }
