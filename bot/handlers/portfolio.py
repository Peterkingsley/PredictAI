from telegram import Update
from telegram.ext import ContextTypes

from bot.keyboards import portfolio_keyboard, portfolio_result_keyboard, position_actions_keyboard, recovery_keyboard
from db.crud import get_position, list_open_positions, list_positions
from db.models import SessionLocal


def _position_numbers(position):
    amount = float(position.amount_usdc)
    shares = float(position.shares)
    entry = float(position.entry_price)
    current = float(position.current_price or position.entry_price)
    value = shares * current
    pnl = value - amount
    return amount, shares, entry, current, value, pnl


async def portfolio_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with SessionLocal() as session:
        positions = await list_open_positions(session, update.effective_user.id)

    if not positions:
        await update.effective_message.reply_text(
            "Your portfolio\n"
            "--------------\n"
            "No open positions yet.\n\nWhen an order fills, PredictAI will show the position and P&L here. To start, open a market and tap Prepare bet.",
            reply_markup=recovery_keyboard(),
        )
        return

    await _reply_or_edit(update, _format_portfolio_dashboard(positions), reply_markup=portfolio_keyboard(positions))


async def history_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with SessionLocal() as session:
        positions = await list_positions(session, update.effective_user.id, limit=10)

    if not positions:
        await update.effective_message.reply_text(
            "Order history\n-------------\nNo completed position history yet.",
            reply_markup=recovery_keyboard(),
        )
        return

    lines = ["Position history", "----------------"]
    for position in positions:
        amount, shares, entry, current, value, pnl = _position_numbers(position)
        lines.extend(
            [
                "",
                position.market_question[:80],
                f"{position.side} - {amount:.2f} USDC - {position.status} - PnL {pnl:+.2f}",
            ]
        )
    await update.effective_message.reply_text("\n".join(lines), reply_markup=portfolio_result_keyboard())


async def pnl_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with SessionLocal() as session:
        positions = await list_positions(session, update.effective_user.id, limit=100)

    open_count = 0
    closed_count = 0
    total_pnl = 0.0
    staked = 0.0
    for position in positions:
        amount, shares, entry, current, value, pnl = _position_numbers(position)
        total_pnl += pnl
        staked += amount
        if position.status == "OPEN":
            open_count += 1
        else:
            closed_count += 1

    await _reply_or_edit(
        update,
        "P&L snapshot\n"
        "------------\n"
        f"Open bets: {open_count}\n"
        f"Closed bets: {closed_count}\n"
        f"Total staked: {staked:.2f} USDC\n"
        f"P&L: {total_pnl:+.2f} USDC",
        reply_markup=portfolio_result_keyboard() if update.callback_query else None,
    )


async def position_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    command = update.effective_message.text.split()[0]
    try:
        position_id = int(command.rsplit("_", 1)[1])
    except (IndexError, ValueError):
        await update.effective_message.reply_text("Open Portfolio and tap a position to view details.", reply_markup=portfolio_result_keyboard())
        return

    async with SessionLocal() as session:
        position = await get_position(session, update.effective_user.id, position_id)
    if not position:
        await update.effective_message.reply_text("That position could not be found. Open Portfolio to refresh the list.", reply_markup=portfolio_result_keyboard())
        return

    await update.effective_message.reply_text(
        _format_position_detail(position),
        reply_markup=position_actions_keyboard(position.id),
    )


async def portfolio_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    if query.data == "portfolio_back":
        await portfolio_command(update, context)
        return

    if query.data == "portfolio_pnl":
        await pnl_command(update, context)
        return

    action, raw_id = query.data.split(":", 1)
    position_id = int(raw_id)

    async with SessionLocal() as session:
        position = await get_position(session, query.from_user.id, position_id)

    if not position:
        await query.edit_message_text("That position could not be found. Open Portfolio to refresh the list.", reply_markup=portfolio_result_keyboard())
        return

    if action == "position_share":
        amount, shares, entry, current, value, pnl = _position_numbers(position)
        await query.edit_message_text(
            "Share preview\n"
            "-------------\n"
            f"PredictAI position: {position.side}\n"
            f"{position.market_question}\n"
            f"P&L: {pnl:+.2f} USDC",
            reply_markup=portfolio_result_keyboard(),
        )
        return

    if action == "position_sell":
        await query.edit_message_text(
            "Sell flow coming next\n"
            "---------------------\n"
            "This position was not closed. When live sell orders are enabled, closing a position will use the same wallet approval flow.",
            reply_markup=portfolio_result_keyboard(),
        )
        return

    await query.edit_message_text(_format_position_detail(position), reply_markup=position_actions_keyboard(position.id))


def _format_position_detail(position) -> str:
    amount, shares, entry, current, value, pnl = _position_numbers(position)
    return (
        f"Position #{position.id}\n"
        "------------\n"
        f"{position.market_question}\n\n"
        f"Side: {position.side}\n"
        f"Status: {position.status}\n"
        f"Stake: {amount:.2f} USDC\n"
        f"Shares: {shares:.2f}\n"
        f"Entry: ${entry:.2f}\n"
        f"Current: ${current:.2f}\n"
        f"Value: {value:.2f} USDC\n"
        f"P&L: {pnl:+.2f} USDC"
    )


def _format_portfolio_dashboard(positions) -> str:
    total_pnl = 0.0
    lines = ["Portfolio", "---------", f"Open positions: {len(positions)}"]
    for position in positions[:10]:
        amount, shares, entry, current, value, pnl = _position_numbers(position)
        total_pnl += pnl
        lines.extend(
            [
                "",
                f"#{position.id} {position.market_question[:72]}",
                f"{position.side} - {amount:.2f} USDC - entry ${entry:.2f} - PnL {pnl:+.2f}",
            ]
        )
    lines.insert(3, f"P&L: {total_pnl:+.2f} USDC")
    lines.append("")
    lines.append("Tap a position to see stake, shares, value, and P&L.")
    return "\n".join(lines)


async def _reply_or_edit(update: Update, text: str, reply_markup=None) -> None:
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup)
        return
    await update.effective_message.reply_text(text, reply_markup=reply_markup)
