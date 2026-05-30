from telegram import Update
from telegram.ext import ContextTypes

from bot.keyboards import position_actions_keyboard
from db.crud import close_demo_position, get_position, list_open_positions, list_positions
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
            "No open demo positions yet.\n\nUse /bet [market] or open a market and tap Bet."
        )
        return

    total_pnl = 0.0
    lines = ["Your portfolio", "--------------", f"Open bets: {len(positions)}"]
    for position in positions[:10]:
        amount, shares, entry, current, value, pnl = _position_numbers(position)
        total_pnl += pnl
        lines.extend(
            [
                "",
                f"#{position.id} {position.market_question[:72]}",
                f"{position.side} - {amount:.2f} USDC - entry ${entry:.2f} - PnL {pnl:+.2f}",
                f"/position_{position.id}",
            ]
        )
    lines.insert(3, f"Demo PnL: {total_pnl:+.2f} USDC")
    await update.effective_message.reply_text("\n".join(lines))


async def history_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with SessionLocal() as session:
        positions = await list_positions(session, update.effective_user.id, limit=10)

    if not positions:
        await update.effective_message.reply_text("Bet history\n-----------\nNo demo bets yet.")
        return

    lines = ["Bet history", "-----------"]
    for position in positions:
        amount, shares, entry, current, value, pnl = _position_numbers(position)
        lines.extend(
            [
                "",
                position.market_question[:80],
                f"{position.side} - {amount:.2f} USDC - {position.status} - PnL {pnl:+.2f}",
            ]
        )
    await update.effective_message.reply_text("\n".join(lines))


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

    await update.effective_message.reply_text(
        "P&L snapshot\n"
        "------------\n"
        f"Open bets: {open_count}\n"
        f"Closed bets: {closed_count}\n"
        f"Total staked: {staked:.2f} USDC\n"
        f"Demo P&L: {total_pnl:+.2f} USDC"
    )


async def position_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    command = update.effective_message.text.split()[0]
    try:
        position_id = int(command.rsplit("_", 1)[1])
    except (IndexError, ValueError):
        await update.effective_message.reply_text("Usage: /position_[id]")
        return

    async with SessionLocal() as session:
        position = await get_position(session, update.effective_user.id, position_id)
    if not position:
        await update.effective_message.reply_text("Position not found.")
        return

    await update.effective_message.reply_text(
        _format_position_detail(position),
        reply_markup=position_actions_keyboard(position.id),
    )


async def portfolio_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    action, raw_id = query.data.split(":", 1)
    position_id = int(raw_id)

    async with SessionLocal() as session:
        if action == "position_sell":
            position = await close_demo_position(session, query.from_user.id, position_id)
        else:
            position = await get_position(session, query.from_user.id, position_id)

    if not position:
        await query.edit_message_text("Position not found.")
        return

    if action == "position_share":
        amount, shares, entry, current, value, pnl = _position_numbers(position)
        await query.edit_message_text(
            "Share preview\n"
            "-------------\n"
            f"I placed a demo {position.side} bet on PredictAI:\n"
            f"{position.market_question}\n"
            f"Demo P&L: {pnl:+.2f} USDC"
        )
        return

    if action == "position_sell":
        await query.edit_message_text(
            "Demo position closed\n"
            "--------------------\n"
            f"{_format_position_detail(position)}"
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
        f"Demo P&L: {pnl:+.2f} USDC"
    )
