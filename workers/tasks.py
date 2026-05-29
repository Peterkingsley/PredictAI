import asyncio
import json

from redis import Redis

from api.config import get_settings
from api.services.polymarket import PolymarketService
from workers.celery_app import celery_app


@celery_app.task
def refresh_market_cache() -> int:
    settings = get_settings()
    redis = Redis.from_url(settings.redis_url)
    markets = asyncio.run(PolymarketService().get_top_markets(limit=50))
    redis.set("cache:markets:top", json.dumps(markets), ex=600)
    return len(markets)


@celery_app.task
def reset_weekly_leaderboard() -> str:
    return "not_enabled"
