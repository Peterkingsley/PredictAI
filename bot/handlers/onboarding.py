from telegram import Update
from telegram.ext import ContextTypes

from api.services.order_submission import PolymarketOrderSubmissionService
from api.services.wallets import short_address
from bot.keyboards import dashboard_keyboard, help_menu_keyboard, help_section_keyboard, recovery_keyboard, start_keyboard
from bot.messages import HELP_SECTIONS, HELP_TEXT, START_TEXT
from db.crud import get_active_wallet, list_alerts, list_open_positions, list_trade_orders
from db.models import SessionLocal


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _show_home(update, context)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(HELP_TEXT, reply_markup=help_menu_keyboard())


async def generic_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    if query.data == "home":
        await _show_home(update, context)
        return
    if query.data == "markets":
        from bot.handlers.markets import markets_command

        context.args = []
        await markets_command(update, context)
        return
    if query.data == "new":
        from bot.handlers.markets import new_command

        context.args = []
        await new_command(update, context)
        return
    if query.data == "search_help":
        await query.edit_message_text(
            "Search markets\n"
            "--------------\n"
            "Type /search followed by a keyword.\n\n"
            "Examples:\n"
            "/search bitcoin\n"
            "/search election\n"
            "/search fed",
            reply_markup=dashboard_keyboard(),
        )
        return
    if query.data == "orders":
        from bot.handlers.orders import orders_command

        await orders_command(update, context)
        return
    if query.data == "portfolio":
        from bot.handlers.portfolio import portfolio_command

        await portfolio_command(update, context)
        return
    if query.data == "status":
        from bot.handlers.status import trading_status_command

        await trading_status_command(update, context)
        return
    if query.data == "wallets":
        from bot.handlers.wallets import wallets_command

        await wallets_command(update, context)
        return
    if query.data == "help":
        await query.edit_message_text(HELP_TEXT, reply_markup=help_menu_keyboard())
        return
    if query.data.startswith("help:"):
        section = query.data.split(":", 1)[1]
        await query.edit_message_text(
            HELP_SECTIONS.get(section, HELP_TEXT),
            reply_markup=help_section_keyboard(),
        )
        return
    if query.data == "connect":
        from bot.handlers.wallets import connect_command

        await connect_command(update, context)
        return
    await query.edit_message_text(
        "This flow is coming next. Try Markets or Search for live market data.",
        reply_markup=recovery_keyboard(),
    )


async def _show_home(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text, has_wallet = await _home_text(update.effective_user.id)
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=start_keyboard(has_wallet=has_wallet))
        return
    await update.effective_message.reply_text(text, reply_markup=start_keyboard(has_wallet=has_wallet))


async def _home_text(telegram_id: int) -> tuple[str, bool]:
    async with SessionLocal() as session:
        wallet = await get_active_wallet(session, telegram_id)
        orders = await list_trade_orders(session, telegram_id, limit=20)
        positions = await list_open_positions(session, telegram_id)
        alerts = await list_alerts(session, telegram_id)

    report = PolymarketOrderSubmissionService().readiness_report()
    live_status = "ready" if report["ready"] else "needs setup"
    wallet_text = short_address(wallet.address) if wallet else "not connected"
    active_orders = [order for order in orders if order.status not in {"FILLED", "CANCELLED", "EXPIRED"}]

    lines = [
        START_TEXT,
        "",
        f"Wallet: {wallet_text}",
        f"Trading: {live_status}",
        f"Active orders: {len(active_orders)}",
        f"Open positions: {len(positions)}",
        f"Active alerts: {len(alerts)}",
        "",
        "Choose an action below.",
    ]
    if not wallet:
        lines.insert(-2, "Next best step: connect a wallet or browse markets first.")
    elif not report["ready"]:
        lines.insert(-2, "Live order submission is not fully ready, but analysis and order preparation still work.")
    else:
        lines.insert(-2, "You are ready to browse, analyze, and prepare orders.")
    return "\n".join(lines), bool(wallet)
