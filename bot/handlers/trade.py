from __future__ import annotations

from io import BytesIO
from urllib.parse import urlencode

import qrcode
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram import Update
from telegram.ext import ContextTypes

from api.config import get_settings
from api.services.polymarket import PolymarketService
from api.services.wallets import short_address
from bot.keyboards import bet_amount_keyboard, bet_confirm_keyboard, bet_side_keyboard
from db.crud import create_signing_intent, get_active_wallet
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
            "Wallet needed\nConnect a wallet before placing a demo bet.\n\nUse /connect, then try again.",
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
        flow.update({"amount": amount, "price": price, "shares": shares})
        await query.edit_message_text(
            "Confirm your demo bet\n"
            "----------------------\n"
            f"Market: {market['question']}\n"
            f"Position: {side}\n"
            f"Amount: {amount:.2f} USDC\n"
            f"Entry price: ${price:.2f}\n"
            f"Shares: {shares:.2f}\n"
            f"Max payout: {shares:.2f} USDC\n\n"
            "This is a simulation. No funds move.",
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

        async with SessionLocal() as session:
            intent = await create_signing_intent(
                session,
                telegram_id=query.from_user.id,
                wallet_address=flow["wallet_address"],
                intent_type="BUY",
                payload={
                    "market_id": market["id"],
                    "market_question": market["question"],
                    "side": flow["side"],
                    "amount_usdc": float(flow["amount"]),
                    "shares": float(flow["shares"]),
                    "entry_price": float(flow["price"]),
                    "wallet_address": flow["wallet_address"],
                    "source": "telegram_qr",
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
