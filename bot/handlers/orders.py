from telegram import Update
from telegram.ext import ContextTypes

from api.services.wallets import short_address
from db.crud import get_trade_order, list_trade_orders
from db.models import SessionLocal


async def orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with SessionLocal() as session:
        orders = await list_trade_orders(session, update.effective_user.id, limit=10)

    if not orders:
        await update.effective_message.reply_text(
            "Orders\n"
            "------\n"
            "No signed orders yet.\n\nUse /bet [market] to prepare one."
        )
        return

    lines = ["Orders", "------"]
    for order in orders:
        lines.extend(
            [
                "",
                f"#{order.id} {order.market_question[:72]}",
                f"{order.order_type} {order.side} - {float(order.amount_usdc):.2f} USDC - {order.status}",
                f"Limit ${float(order.limit_price):.4f} - Shares {float(order.shares):.2f}",
                f"/order_{order.id}",
            ]
        )
    await update.effective_message.reply_text("\n".join(lines))


async def order_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    command = update.effective_message.text.split()[0]
    try:
        order_id = int(command.rsplit("_", 1)[1])
    except (IndexError, ValueError):
        await update.effective_message.reply_text("Usage: /order_[id]")
        return

    async with SessionLocal() as session:
        order = await get_trade_order(session, update.effective_user.id, order_id)
    if not order:
        await update.effective_message.reply_text("Order not found.")
        return

    await update.effective_message.reply_text(_format_order_detail(order))


def _format_order_detail(order) -> str:
    submission = order.submission or {}
    message = submission.get("message") or "-"
    polymarket_id = order.polymarket_order_id or "-"
    return (
        f"Order #{order.id}\n"
        "--------\n"
        f"{order.market_question}\n\n"
        f"Type: {order.order_type}\n"
        f"Side: {order.side}\n"
        f"Status: {order.status}\n"
        f"Wallet: {short_address(order.wallet_address)}\n"
        f"Amount: {float(order.amount_usdc):.2f} USDC\n"
        f"Shares: {float(order.shares):.2f}\n"
        f"Limit: ${float(order.limit_price):.4f}\n"
        f"Signing request: #{order.signing_intent_id}\n"
        f"Polymarket order: {polymarket_id}\n\n"
        f"Submission: {message}"
    )
