from telegram import Update
from telegram.ext import ContextTypes

from api.services.ai_analysis import AIAnalysisService
from api.services.polymarket import PolymarketService
from bot.keyboards import analysis_result_keyboard, recovery_keyboard

market_service = PolymarketService()
ai_service = AIAnalysisService()


async def analyze_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    target = " ".join(context.args) if context.args else ""
    if not target:
        await update.effective_message.reply_text(
            "Get a market brief\n"
            "------------------\n"
            "Open a market and tap Analyze, or type /analyze followed by a topic. PredictAI will summarize the market view and key considerations.",
            reply_markup=recovery_keyboard(),
        )
        return

    market = context.user_data.get("selected_market") if target == "selected" else await market_service.get_market(target)
    if not market:
        results = await market_service.search_markets(target, limit=1)
        market = results[0] if results else None

    if not market:
        await update.effective_message.reply_text(
            f'No market found for "{target}".',
            reply_markup=recovery_keyboard(),
        )
        return

    context.user_data["selected_market"] = market
    report = await ai_service.analyze_market(market)
    text = (
        "Market brief\n"
        "------------\n"
        f"{report['question']}\n\n"
        f"Current market view: {report['probability']:.0f}% Yes\n\n"
        f"{report['analysis']}\n\n"
        "Use this as context, not financial advice. You can prepare a position, set an alert, or return to the market card."
    )

    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=analysis_result_keyboard())
    else:
        await update.effective_message.reply_text(text, reply_markup=analysis_result_keyboard())


async def quick_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await analyze_command(update, context)
