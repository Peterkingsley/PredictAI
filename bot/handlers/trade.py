from __future__ import annotations

from io import BytesIO
from urllib.parse import urlencode

import qrcode
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram import Update
from telegram.ext import ContextTypes

from api.config import get_settings
from api.services.order_submission import PolymarketOrderSubmissionService
from api.services.polymarket import PolymarketService
from api.services.wallets import get_usdc_allowance, get_usdc_balance, is_evm_address, short_address
from bot.keyboards import bet_amount_keyboard, bet_confirm_keyboard, bet_side_keyboard
from db.crud import create_signing_intent, get_active_wallet, update_signing_intent_payload
from db.models import SessionLocal

service = PolymarketService()


async def bet_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    target = " ".join(context.args) if context.args else ""
    market = None
    if target:
        market = await service.get_market(target)
        if not market:
            results = await service.search_markets(target, limit=1)
            market = results[0] if results else None
    else:
        market = context.user_data.get("selected_market")

    if not market:
        await update.effective_message.reply_text("Usage: /bet [market id or keyword]\nTry /markets or /search first.")
        return

    await start_bet_flow(update, context, market)


async def start_bet_flow(update: Update, context: ContextTypes.DEFAULT_TYPE, market: dict) -> None:
    async with SessionLocal() as session:
        wallet = await get_active_wallet(session, update.effective_user.id)

    if not wallet:
        await _reply_or_edit(
            update,
            "Wallet needed\nConnect a wallet before preparing an order.\n\nUse /connect, then try again.",
        )
        return

    context.user_data["selected_market"] = market
    context.user_data["bet_flow"] = {
        "market": market,
        "wallet_address": wallet.address,
    }
    await _reply_or_edit(
        update,
        f"{market['question']}\nWhich side?\n\nYes - {market['probability']:.0f}%\nNo - {100 - market['probability']:.0f}%",
        reply_markup=bet_side_keyboard(),
    )


async def trade_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    action = query.data
    flow = context.user_data.get("bet_flow")
    if not flow:
        await query.edit_message_text("Bet flow expired. Use /bet [market] to start again.")
        return

    if action.startswith("bet_side:"):
        side = action.split(":", 1)[1]
        flow["side"] = side
        await query.edit_message_text(
            f"Betting {side}\nHow much USDC?\n\nWallet: {short_address(flow['wallet_address'])}",
            reply_markup=bet_amount_keyboard(),
        )
        return

    if action.startswith("bet_amount:"):
        amount = float(action.split(":", 1)[1])
        market = flow["market"]
        side = flow["side"]
        price = _price_for_side(market, side)
        shares = amount / price if price > 0 else 0
        validation_errors = await _pre_trade_validation(
            market=market,
            side=side,
            amount=amount,
            shares=shares,
            wallet_address=flow["wallet_address"],
        )
        if validation_errors:
            await query.edit_message_text(
                "Order cannot be prepared yet\n"
                "----------------------------\n"
                + _format_pre_trade_errors(validation_errors)
                + "\n\nAdjust the amount or try another market.",
                reply_markup=bet_amount_keyboard(),
            )
            return
        flow.update({"amount": amount, "price": price, "shares": shares})
        await query.edit_message_text(
            "Confirm your order\n"
            "------------------\n"
            f"Market: {market['question']}\n"
            f"Position: {side}\n"
            f"Amount: {amount:.2f} USDC\n"
            f"Entry price: ${price:.2f}\n"
            f"Shares: {shares:.2f}\n"
            f"Max payout: {shares:.2f} USDC\n\n"
            "Next step: sign this order with your connected wallet.",
            reply_markup=bet_confirm_keyboard(),
        )
        return

    if action == "bet_cancel":
        context.user_data.pop("bet_flow", None)
        await query.edit_message_text("Bet cancelled.")
        return

    if action == "bet_confirm":
        market = flow["market"]
        settings = get_settings()
        if not settings.mini_app_url:
            await query.edit_message_text("Signing is almost ready. Set MINI_APP_URL, then try again.")
            return
        validation_errors = await _pre_trade_validation(
            market=market,
            side=flow["side"],
            amount=float(flow["amount"]),
            shares=float(flow["shares"]),
            wallet_address=flow["wallet_address"],
        )
        if validation_errors:
            await query.edit_message_text(
                "Order blocked before signing\n"
                "----------------------------\n"
                + _format_pre_trade_errors(validation_errors)
            )
            return

        async with SessionLocal() as session:
            base_payload = {
                "market_id": market["id"],
                "market_question": market["question"],
                "side": flow["side"],
                "amount_usdc": float(flow["amount"]),
                "shares": float(flow["shares"]),
                "entry_price": float(flow["price"]),
                "wallet_address": flow["wallet_address"],
                "outcome_token_id": _token_id_for_side(market, flow["side"]),
                "source": "telegram_qr",
            }
            intent = await create_signing_intent(
                session,
                telegram_id=query.from_user.id,
                wallet_address=flow["wallet_address"],
                intent_type="BUY",
                payload=base_payload,
            )
            intent = await update_signing_intent_payload(
                session,
                intent.id,
                {
                    **base_payload,
                    "signature_kind": "predictai_eip712_order_intent",
                    "typed_data": _build_order_intent_typed_data(intent.id, base_payload),
                },
            )

        signing_url = _signing_url(settings.mini_app_url, intent.id, query.from_user.id)
        qr_image = _qr_png(signing_url)
        context.user_data.pop("bet_flow", None)
        await query.edit_message_text(
            "Signing request created\n"
            "-----------------------\n"
            f"{float(flow['amount']):.2f} USDC on {flow['side']}\n"
            f"{market['question']}\n\n"
            "Scan the QR code with MetaMask or Trust Wallet, approve in your wallet, then wait for Telegram confirmation."
        )
        await context.bot.send_photo(
            chat_id=query.message.chat_id,
            photo=qr_image,
            caption=f"Signing request #{intent.id}\nWallet: {short_address(flow['wallet_address'])}",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("Open signing page", url=signing_url)]]),
        )


def _price_for_side(market: dict, side: str) -> float:
    if side == "YES":
        return max(float(market.get("yes_price") or market.get("probability", 0) / 100), 0.01)
    return max(float(market.get("no_price") or (100 - market.get("probability", 0)) / 100), 0.01)


def _token_id_for_side(market: dict, side: str) -> str | None:
    if side == "YES":
        return market.get("yes_token_id")
    return market.get("no_token_id")


async def _pre_trade_validation(
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
    if not _token_id_for_side(market, side):
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
        else:
            try:
                allowance = await get_usdc_allowance(wallet_address, spender)
            except Exception:
                allowance = None
            if allowance is None:
                errors.append("USDC allowance could not be checked from the Polygon RPC.")
            elif allowance < amount:
                errors.append(f"USDC allowance for Polymarket is {allowance:.2f}, below {amount:.2f} USDC.")
    return errors


def _format_pre_trade_errors(errors: list[str]) -> str:
    lines = []
    for error in errors:
        lines.append(f"- {error}")
        hint = _pre_trade_hint(error)
        if hint:
            lines.append(f"  Fix: {hint}")
    return "\n".join(lines)


def _pre_trade_hint(error: str) -> str:
    lowered = error.lower()
    if "live submission" in lowered or "polymarket_order_submission_enabled" in lowered:
        return "Run /status and enable live submission only after the API is in an allowed region."
    if "minimum order size" in lowered:
        return "Choose a larger amount."
    if "usdc balance" in lowered:
        return "Fund the connected Polygon wallet with enough USDC."
    if "polymarket_usdc_spender" in lowered:
        return "Set POLYMARKET_USDC_SPENDER to the Polymarket USDC spender/adapter address for this account type."
    if "usdc allowance" in lowered:
        return "Approve USDC for the configured Polymarket spender, then try the order again."
    if "market is not active" in lowered or "token is missing" in lowered:
        return "Use /markets or /search to pick another live market."
    if "greater than zero" in lowered:
        return "Choose a valid amount."
    return ""


def _build_order_intent_typed_data(intent_id: int, payload: dict) -> dict:
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


def _signing_url(mini_app_url: str, intent_id: int, telegram_id: int) -> str:
    separator = "&" if "?" in mini_app_url else "?"
    return f"{mini_app_url}{separator}{urlencode({'intent_id': intent_id, 'telegram_id': telegram_id})}"


def _qr_png(value: str) -> BytesIO:
    image = qrcode.make(value)
    output = BytesIO()
    image.save(output, format="PNG")
    output.seek(0)
    output.name = "predictai-signing-request.png"
    return output


async def _reply_or_edit(update: Update, text: str, reply_markup=None) -> None:
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup)
    else:
        await update.effective_message.reply_text(text, reply_markup=reply_markup)
