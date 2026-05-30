from telegram import Update
from telegram.ext import ContextTypes

from api.services.polymarket import PolymarketService, PolymarketServiceError
from bot.keyboards import market_actions_keyboard
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
        await update.effective_message.reply_text("Could not reach Polymarket. Try again in a moment.")
        return

    await update.effective_message.reply_text(format_market_list(title, markets))


async def new_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        markets = await service.get_new_markets(limit=10)
    except PolymarketServiceError:
        await update.effective_message.reply_text("Could not reach Polymarket. Try again in a moment.")
        return
    await update.effective_message.reply_text(format_market_list("New markets", markets))


async def search_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.effective_message.reply_text("Usage: /search [keyword]")
        return
    query = " ".join(context.args)
    markets = await service.search_markets(query, limit=5)
    if not markets:
        await update.effective_message.reply_text(f'No markets found for "{query}". Try different keywords.')
        return
    await update.effective_message.reply_text(format_market_list(f'{len(markets)} results for "{query}"', markets))


async def market_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.effective_message.reply_text("Usage: /market [market id]")
        return
    market = await service.get_market(context.args[0])
    if not market:
        await update.effective_message.reply_text("Market not found.")
        return
    context.user_data["selected_market"] = market
    await update.effective_message.reply_text(format_market_detail(market), reply_markup=market_actions_keyboard(market["id"]))


async def market_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    action, market_id = query.data.split(":", 1)
    if market_id == "selected":
        market = context.user_data.get("selected_market")
    else:
        market = await service.get_market(market_id)
    if not market:
        await query.edit_message_text("Market not found.")
        return
    context.user_data["selected_market"] = market
    if action == "market":
        await query.edit_message_text(format_market_detail(market), reply_markup=market_actions_keyboard(market_id))
    elif action == "analyze":
        context.args = [market_id]
        from bot.handlers.analyze import analyze_command

        await analyze_command(update, context)
    elif action == "bet":
        from bot.handlers.trade import start_bet_flow

        await start_bet_flow(update, context, market)
