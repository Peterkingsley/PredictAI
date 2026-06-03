from telegram import Update
from telegram.ext import ContextTypes

from api.services.polymarket import PolymarketService, PolymarketServiceError
from bot.keyboards import market_actions_keyboard, market_results_keyboard, recovery_keyboard
from bot.messages import format_market_detail, format_market_list

service = PolymarketService()


async def markets_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    category = context.args[0].lower() if context.args else None
    try:
        if category:
            markets = await service.get_markets_by_category(category, limit=10)
            title = f"{category.title()} markets"
        else:
            markets = await service.get_top_markets(limit=10)
            title = "Top markets"
    except PolymarketServiceError:
        await update.effective_message.reply_text(
            "Could not reach Polymarket. Try again in a moment.",
            reply_markup=recovery_keyboard(),
        )
        return

    await _send_market_results(update, context, title, markets)


async def new_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        markets = await service.get_new_markets(limit=10)
    except PolymarketServiceError:
        await update.effective_message.reply_text(
            "Could not reach Polymarket. Try again in a moment.",
            reply_markup=recovery_keyboard(),
        )
        return
    await _send_market_results(update, context, "New markets", markets)


async def search_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.effective_message.reply_text(
            "Search markets\n"
            "--------------\n"
            "Type /search followed by a keyword.\n\n"
            "Example: /search bitcoin",
            reply_markup=recovery_keyboard(),
        )
        return
    query = " ".join(context.args)
    markets = await service.search_markets(query, limit=5)
    if not markets:
        await update.effective_message.reply_text(
            f'No markets found for "{query}". Try different keywords.',
            reply_markup=recovery_keyboard(),
        )
        return
    await _send_market_results(update, context, f'{len(markets)} results for "{query}"', markets)


async def market_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.effective_message.reply_text(
            "Open a market\n"
            "-------------\n"
            "Choose a market from Markets or Search, or use /market with a market id.",
            reply_markup=recovery_keyboard(),
        )
        return
    market = await service.get_market(context.args[0])
    if not market:
        await update.effective_message.reply_text("No matching market found. Try Markets or Search.", reply_markup=recovery_keyboard())
        return
    context.user_data["selected_market"] = market
    await update.effective_message.reply_text(
        format_market_detail(market),
        reply_markup=market_actions_keyboard(market["id"], include_back=bool(context.user_data.get("market_results"))),
    )


async def market_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    if query.data == "market_back":
        await _show_previous_market_results(update, context)
        return
    action, market_id = query.data.split(":", 1)
    if action == "market_pick":
        await _show_picked_market(update, context, market_id)
        return
    if market_id == "selected":
        market = context.user_data.get("selected_market")
    else:
        market = await service.get_market(market_id)
    if not market:
        await query.edit_message_text("No matching market found. Try Markets or Search.", reply_markup=recovery_keyboard())
        return
    context.user_data["selected_market"] = market
    if action == "market":
        await query.edit_message_text(
            format_market_detail(market),
            reply_markup=market_actions_keyboard(market_id, include_back=bool(context.user_data.get("market_results"))),
        )
    elif action == "analyze":
        context.args = [market_id]
        from bot.handlers.analyze import analyze_command

        await analyze_command(update, context)
    elif action == "alert_market":
        context.user_data["alert_market"] = market
        from bot.keyboards import alert_threshold_keyboard

        await query.edit_message_text(
            "Set alert\n"
            "---------\n"
            f"{market['question']}\n\n"
            f"Current Yes probability: {market['probability']:.0f}%\n"
            "Notify me when probability crosses:",
            reply_markup=alert_threshold_keyboard(),
        )
    elif action == "bet":
        from bot.handlers.trade import start_bet_flow

        await start_bet_flow(update, context, market)


async def _send_market_results(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    title: str,
    markets: list[dict],
) -> None:
    context.user_data["market_results"] = markets[:10]
    context.user_data["market_results_title"] = title
    text = format_market_list(title, markets)
    reply_markup = market_results_keyboard(markets)
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup)
        return
    await update.effective_message.reply_text(text, reply_markup=reply_markup)


async def _show_picked_market(update: Update, context: ContextTypes.DEFAULT_TYPE, raw_index: str) -> None:
    query = update.callback_query
    try:
        index = int(raw_index)
    except ValueError:
        await query.edit_message_text(
            "This market list expired. Open Markets or Search to refresh it.",
            reply_markup=recovery_keyboard(),
        )
        return
    markets = context.user_data.get("market_results") or []
    if index < 0 or index >= len(markets):
        await query.edit_message_text(
            "This market list expired. Open Markets or Search to refresh it.",
            reply_markup=recovery_keyboard(),
        )
        return
    market = markets[index]
    context.user_data["selected_market"] = market
    await query.edit_message_text(
        format_market_detail(market),
        reply_markup=market_actions_keyboard(market["id"], include_back=True),
    )


async def _show_previous_market_results(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    markets = context.user_data.get("market_results") or []
    title = context.user_data.get("market_results_title") or "Markets"
    if not markets:
        await query.edit_message_text(
            "This market list expired. Open Markets or Search to refresh it.",
            reply_markup=recovery_keyboard(),
        )
        return
    await query.edit_message_text(
        format_market_list(title, markets),
        reply_markup=market_results_keyboard(markets),
    )
