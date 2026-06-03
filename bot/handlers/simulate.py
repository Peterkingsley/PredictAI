from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from api.services.wallets import short_address
from bot.keyboards import recovery_keyboard, simulate_amount_keyboard, simulate_result_keyboard, simulate_side_keyboard


async def start_simulation(update: Update, context: ContextTypes.DEFAULT_TYPE, market: dict) -> None:
    context.user_data["selected_market"] = market
    context.user_data["simulate_flow"] = {"market": market}
    await _show_side_step(update, context)


async def simulate_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    action = query.data
    flow = context.user_data.get("simulate_flow")
    if not flow:
        market = context.user_data.get("selected_market")
        if not market:
            await query.edit_message_text(
                "This simulation expired. Open a market and tap Simulate again.",
                reply_markup=recovery_keyboard(),
            )
            return
        flow = {"market": market}
        context.user_data["simulate_flow"] = flow

    if action == "simulate_back_side":
        flow.pop("side", None)
        await _show_side_step(update, context)
        return

    if action == "simulate_back_amount":
        await _show_amount_step(update, context)
        return

    if action.startswith("simulate_side:"):
        flow["side"] = action.split(":", 1)[1]
        await _show_amount_step(update, context)
        return

    if action.startswith("simulate_amount:"):
        amount = float(action.split(":", 1)[1])
        await _show_result(update, context, amount)
        return

    await query.edit_message_text(
        "This simulation expired. Open a market and tap Simulate again.",
        reply_markup=recovery_keyboard(),
    )


async def _show_side_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    flow = context.user_data["simulate_flow"]
    market = flow["market"]
    await _reply_or_edit(
        update,
        f"{market['question']}\n"
        "Simulate a position\n"
        "-------------------\n"
        f"Yes: {market['probability']:.0f}% at ${_price_for_side(market, 'YES'):.2f}\n"
        f"No: {100 - market['probability']:.0f}% at ${_price_for_side(market, 'NO'):.2f}\n\n"
        "Choose a side to estimate shares and possible payout. No wallet is needed for simulation.",
        reply_markup=simulate_side_keyboard(),
    )


async def _show_amount_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    flow = context.user_data["simulate_flow"]
    market = flow["market"]
    side = flow.get("side")
    if not side:
        await _show_side_step(update, context)
        return
    price = _price_for_side(market, side)
    await _reply_or_edit(
        update,
        "Choose simulation amount\n"
        "------------------------\n"
        f"Market: {market['question']}\n"
        f"Position: {side}\n"
        f"Estimated entry price: ${price:.2f}\n\n"
        "Pick an amount to see estimated shares and max payout.",
        reply_markup=simulate_amount_keyboard(),
    )


async def _show_result(update: Update, context: ContextTypes.DEFAULT_TYPE, amount: float) -> None:
    flow = context.user_data["simulate_flow"]
    market = flow["market"]
    side = flow.get("side")
    if not side:
        await _show_side_step(update, context)
        return

    price = _price_for_side(market, side)
    shares = amount / price if price > 0 else 0
    context.user_data["selected_market"] = market

    await _reply_or_edit(
        update,
        "Position simulation\n"
        "-------------------\n"
        f"Market: {market['question']}\n"
        f"Position: {side}\n"
        f"Amount: {amount:.2f} USDC\n"
        f"Estimated entry: ${price:.2f}\n"
        f"Estimated shares: {shares:.2f}\n"
        f"Max payout if correct: {shares:.2f} USDC\n\n"
        "This is only an estimate. It does not connect a wallet, sign, or place an order.\n\n"
        "If this looks useful, prepare the bet and review it before wallet signing.",
        reply_markup=simulate_result_keyboard(),
    )


def _price_for_side(market: dict, side: str) -> float:
    if side == "YES":
        return max(float(market.get("yes_price") or market.get("probability", 0) / 100), 0.01)
    return max(float(market.get("no_price") or (100 - market.get("probability", 0)) / 100), 0.01)


async def _reply_or_edit(update: Update, text: str, reply_markup=None) -> None:
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup)
        return
    await update.effective_message.reply_text(text, reply_markup=reply_markup)
