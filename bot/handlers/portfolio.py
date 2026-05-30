from telegram import Update
from telegram.ext import ContextTypes

from db.crud import list_open_positions
from db.models import SessionLocal


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
        amount = float(position.amount_usdc)
        shares = float(position.shares)
        entry = float(position.entry_price)
        current = float(position.current_price or position.entry_price)
        pnl = shares * current - amount
        total_pnl += pnl
        lines.extend(
            [
                "",
                position.market_question[:80],
                f"{position.side} - {amount:.2f} USDC - entry ${entry:.2f} - PnL {pnl:+.2f}",
            ]
        )
    lines.insert(3, f"Demo PnL: {total_pnl:+.2f} USDC")
    await update.effective_message.reply_text("\n".join(lines))
