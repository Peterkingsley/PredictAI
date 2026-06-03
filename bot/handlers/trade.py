from __future__ import annotations

from io import BytesIO
import math
from urllib.parse import urlencode

import qrcode
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram import Update
from telegram.ext import ContextTypes

from api.config import get_settings
from api.services.order_submission import PolymarketOrderSubmissionService
from api.services.polymarket import PolymarketService
from api.services.wallets import get_usdc_balance, is_evm_address, short_address
from bot.keyboards import (
    bet_amount_keyboard,
    bet_blocked_keyboard,
    bet_confirm_keyboard,
    bet_side_keyboard,
    connect_wallet_keyboard,
    recovery_keyboard,
)
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
        await update.effective_message.reply_text(
            "Prepare a bet\n"
            "-------------\n"
            "Open a market and tap Bet, or type /bet followed by a market keyword.",
            reply_markup=recovery_keyboard(),
        )
        return

    await start_bet_flow(update, context, market)


async def start_bet_flow(update: Update, context: ContextTypes.DEFAULT_TYPE, market: dict) -> None:
    async with SessionLocal() as session:
        wallet = await get_active_wallet(session, update.effective_user.id)

    if not wallet:
        await _reply_or_edit(
            update,
            "Wallet needed\nConnect a wallet before preparing an order.",
            reply_markup=connect_wallet_keyboard(update.effective_user.id),
        )
        return

    context.user_data["selected_market"] = market
    context.user_data["bet_flow"] = {
        "market": market,
        "wallet_address": wallet.address,
    }
    await _show_side_step(update, context)


async def trade_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    action = query.data
    flow = context.user_data.get("bet_flow")
    if not flow:
        await query.edit_message_text("Bet flow expired. Open a market and tap Bet again.", reply_markup=recovery_keyboard())
        return

    if action == "bet_back_side":
        flow.pop("side", None)
        flow.pop("amount", None)
        flow.pop("price", None)
        flow.pop("shares", None)
        flow.pop("awaiting_custom_amount", None)
        await _show_side_step(update, context)
        return

    if action == "bet_back_amount":
        flow.pop("amount", None)
        flow.pop("price", None)
        flow.pop("shares", None)
        flow.pop("awaiting_custom_amount", None)
        await _show_amount_step(update, context)
        return

    if action.startswith("bet_side:"):
        side = action.split(":", 1)[1]
        flow["side"] = side
        await _show_amount_step(update, context)
        return

    if action == "bet_amount_custom":
        flow["awaiting_custom_amount"] = True
        await query.edit_message_text(
            "Custom amount\n"
            "-------------\n"
            "Type the USDC amount you want to use for this order.\n\n"
            "Example: 12.50",
            reply_markup=bet_amount_keyboard(),
        )
        return

    if action.startswith("bet_amount:"):
        amount = float(action.split(":", 1)[1])
        await _prepare_amount(update, context, amount)
        return

    if action == "bet_cancel":
        context.user_data.pop("bet_flow", None)
        await query.edit_message_text("Bet cancelled.", reply_markup=recovery_keyboard())
        return

    if action == "bet_confirm":
        market = flow["market"]
        settings = get_settings()
        if not settings.mini_app_url:
            await query.edit_message_text(
                "Signing is almost ready. Set MINI_APP_URL, then try again.",
                reply_markup=recovery_keyboard(),
            )
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
                + _format_pre_trade_errors(validation_errors),
                reply_markup=bet_blocked_keyboard(),
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


async def custom_amount_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    flow = context.user_data.get("bet_flow")
    if not flow or not flow.get("awaiting_custom_amount"):
        return

    raw_amount = (update.effective_message.text or "").strip().replace("$", "")
    try:
        amount = float(raw_amount)
    except ValueError:
        await update.effective_message.reply_text(
            "That amount was not clear. Type a number like 10 or 12.50.",
            reply_markup=bet_amount_keyboard(),
        )
        return
    if not math.isfinite(amount):
        await update.effective_message.reply_text(
            "That amount was not valid. Type a normal number like 10 or 12.50.",
            reply_markup=bet_amount_keyboard(),
        )
        return

    flow.pop("awaiting_custom_amount", None)
    await _prepare_amount(update, context, amount)


def _price_for_side(market: dict, side: str) -> float:
    if side == "YES":
        return max(float(market.get("yes_price") or market.get("probability", 0) / 100), 0.01)
    return max(float(market.get("no_price") or (100 - market.get("probability", 0)) / 100), 0.01)


def _token_id_for_side(market: dict, side: str) -> str | None:
    if side == "YES":
        return market.get("yes_token_id")
    return market.get("no_token_id")


async def _show_side_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    flow = context.user_data["bet_flow"]
    market = flow["market"]
    await _reply_or_edit(
        update,
        f"{market['question']}\n"
        "Choose side\n"
        "-----------\n"
        f"Yes: {market['probability']:.0f}% at ${_price_for_side(market, 'YES'):.2f}\n"
        f"No: {100 - market['probability']:.0f}% at ${_price_for_side(market, 'NO'):.2f}\n\n"
        "Choose the side you want to buy.",
        reply_markup=bet_side_keyboard(),
    )


async def _show_amount_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    flow = context.user_data["bet_flow"]
    side = flow.get("side")
    if not side:
        await _show_side_step(update, context)
        return
    market = flow["market"]
    balance_text = await _wallet_balance_text(flow["wallet_address"])
    price = _price_for_side(market, side)
    await _reply_or_edit(
        update,
        "Choose amount\n"
        "-------------\n"
        f"Market: {market['question']}\n"
        f"Position: {side}\n"
        f"Entry price: ${price:.2f}\n"
        f"Wallet: {short_address(flow['wallet_address'])}\n"
        f"{balance_text}\n\n"
        "Choose a preset amount or tap Custom amount.",
        reply_markup=bet_amount_keyboard(),
    )


async def _prepare_amount(update: Update, context: ContextTypes.DEFAULT_TYPE, amount: float) -> None:
    flow = context.user_data.get("bet_flow")
    if not flow:
        await _reply_or_edit(update, "Bet flow expired. Use /bet [market] to start again.")
        return
    if not flow.get("side"):
        await _show_side_step(update, context)
        return
    if not math.isfinite(amount):
        await _reply_or_edit(
            update,
            "That amount was not valid. Choose a preset amount or type a normal number.",
            reply_markup=bet_amount_keyboard(),
        )
        return

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
        await _reply_or_edit(
            update,
            "Order cannot be prepared yet\n"
            "----------------------------\n"
            f"Market: {market['question']}\n"
            f"Position: {side}\n"
            f"Amount: {amount:.2f} USDC\n\n"
            + _format_pre_trade_errors(validation_errors)
            + "\n\nChoose another amount, check status, or return to the market.",
            reply_markup=bet_blocked_keyboard(),
        )
        return

    flow.update({"amount": amount, "price": price, "shares": shares})
    await _reply_or_edit(
        update,
        "Confirm your order\n"
        "------------------\n"
        f"Market: {market['question']}\n"
        f"Position: {side}\n"
        f"Amount: {amount:.2f} USDC\n"
        f"Entry price: ${price:.2f}\n"
        f"Shares: {shares:.2f}\n"
        f"Max payout: {shares:.2f} USDC\n"
        f"Wallet: {short_address(flow['wallet_address'])}\n\n"
        "Next step: sign this order with your connected wallet.",
        reply_markup=bet_confirm_keyboard(),
    )


async def _wallet_balance_text(wallet_address: str) -> str:
    try:
        balance = await get_usdc_balance(wallet_address)
    except Exception:
        balance = None
    if balance is None:
        return "USDC balance: unavailable"
    return f"USDC balance: {balance:.2f}"


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
