from __future__ import annotations

from datetime import datetime, timedelta

from api.config import get_settings
from api.services.wallets import is_evm_address, short_address


DEFAULT_MAX_ORDER_USDC = 25.0
DEFAULT_DAILY_LIMIT_USDC = 100.0
DEFAULT_AUTH_DAYS = 30


def build_fast_trading_message(
    telegram_id: int,
    wallet_address: str,
    max_order_usdc: float = DEFAULT_MAX_ORDER_USDC,
    daily_limit_usdc: float = DEFAULT_DAILY_LIMIT_USDC,
    expires_at: datetime | None = None,
) -> str:
    expiry = expires_at or default_fast_trading_expiry()
    return "\n".join(
        [
            "PredictAI fast trading authorization",
            f"Wallet: {wallet_address.lower()}",
            f"Telegram ID: {telegram_id}",
            f"Chain ID: {get_settings().polygon_chain_id}",
            f"Max order: {float(max_order_usdc):.2f} USDC",
            f"Daily limit: {float(daily_limit_usdc):.2f} USDC",
            f"Expires: {expiry.replace(microsecond=0).isoformat()}Z",
            "Scope: PredictAI may prepare and submit only Telegram-confirmed Polymarket orders within these limits.",
            "Safety: This does not share your private key or seed phrase.",
        ]
    )


def default_fast_trading_expiry() -> datetime:
    return datetime.utcnow() + timedelta(days=DEFAULT_AUTH_DAYS)


def verify_fast_trading_signature(wallet_address: str, message: str, signature: str) -> dict:
    if not is_evm_address(wallet_address):
        return {"verified": False, "message": "Invalid wallet address.", "recovered_address": None}
    if not signature:
        return {"verified": False, "message": "Missing authorization signature.", "recovered_address": None}
    try:
        from eth_account import Account
        from eth_account.messages import encode_defunct
    except ImportError as exc:
        return {"verified": False, "message": f"Signature verification dependency is missing: {exc}", "recovered_address": None}

    try:
        recovered_address = Account.recover_message(encode_defunct(text=message), signature=signature)
    except Exception as exc:
        return {"verified": False, "message": f"Unable to recover signer: {exc}", "recovered_address": None}

    if recovered_address.lower() != wallet_address.lower():
        return {
            "verified": False,
            "message": f"Signature was created by {short_address(recovered_address)}, not {short_address(wallet_address)}.",
            "recovered_address": recovered_address,
        }
    return {"verified": True, "message": "Fast trading authorization verified.", "recovered_address": recovered_address}
