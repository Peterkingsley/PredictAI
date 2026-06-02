import asyncio
import json
import logging

from redis import Redis
from telegram import Bot

from api.config import get_settings
from api.services.polymarket import PolymarketService
from db.crud import list_untriggered_alerts, mark_alert_triggered
from db.models import SessionLocal, init_db
from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task
def refresh_market_cache() -> int:
    settings = get_settings()
    redis = Redis.from_url(settings.redis_url)
    markets = asyncio.run(PolymarketService().get_top_markets(limit=50))
    redis.set("cache:markets:top", json.dumps(markets), ex=600)
    return len(markets)


@celery_app.task
def reset_weekly_leaderboard() -> str:
    return "not_configured"


@celery_app.task
def check_price_alerts() -> int:
    return asyncio.run(_check_price_alerts())


async def _check_price_alerts() -> int:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return 0

    await init_db()
    bot = Bot(settings.telegram_bot_token)
    service = PolymarketService()
    sent = 0

    async with SessionLocal() as session:
        alerts = await list_untriggered_alerts(session)

        for alert, telegram_id in alerts:
            market = await service.get_market(alert.market_id)
            if not market:
                continue
            probability = float(market["probability"])
            threshold = float(alert.threshold)
            crossed = (
                alert.direction == "ABOVE" and probability >= threshold
            ) or (
                alert.direction == "BELOW" and probability <= threshold
            )
            if not crossed:
                continue

            try:
                await bot.send_message(
                    chat_id=telegram_id,
                    text=(
                        "Alert triggered\n"
                        "---------------\n"
                        f"{alert.market_question}\n"
                        f"Yes probability is now {probability:.0f}% "
                        f"(threshold {threshold:.0f}%).\n\n"
                        f"/market {alert.market_id}"
                    ),
                )
            except Exception:
                logger.exception("Failed to send alert %s to Telegram user %s", alert.id, telegram_id)
                continue
            await mark_alert_triggered(session, alert.id)
            sent += 1

    return sent
