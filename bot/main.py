import logging

from telegram.ext import Application, CallbackQueryHandler, CommandHandler, MessageHandler, filters

from api.config import get_settings
from bot.handlers import analyze, markets, onboarding, portfolio, trade, wallets
from db.models import init_db

logging.basicConfig(
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
    level=logging.INFO,
)


async def post_init(_: Application) -> None:
    await init_db()


def build_app() -> Application:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is required")

    app = Application.builder().token(settings.telegram_bot_token).post_init(post_init).build()
    app.add_handler(CommandHandler("start", onboarding.start))
    app.add_handler(CommandHandler("help", onboarding.help_command))
    app.add_handler(CommandHandler("markets", markets.markets_command))
    app.add_handler(CommandHandler("new", markets.new_command))
    app.add_handler(CommandHandler("search", markets.search_command))
    app.add_handler(CommandHandler("market", markets.market_command))
    app.add_handler(CommandHandler("analyze", analyze.analyze_command))
    app.add_handler(CommandHandler("quick", analyze.quick_command))
    app.add_handler(CommandHandler("portfolio", portfolio.portfolio_command))
    app.add_handler(CommandHandler("bet", trade.bet_command))
    app.add_handler(CommandHandler("connect", wallets.connect_command))
    app.add_handler(CommandHandler("wallets", wallets.wallets_command))
    app.add_handler(CommandHandler("disconnect", wallets.disconnect_command))
    app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, wallets.handle_web_app_data))
    app.add_handler(CallbackQueryHandler(markets.market_callback, pattern=r"^(market|analyze|bet):"))
    app.add_handler(CallbackQueryHandler(trade.trade_callback, pattern=r"^bet_(side|amount|confirm|cancel)"))
    app.add_handler(CallbackQueryHandler(onboarding.generic_callback))
    return app


def main() -> None:
    app = build_app()
    app.run_polling(allowed_updates=["message", "callback_query"])


if __name__ == "__main__":
    main()
