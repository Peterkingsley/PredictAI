from celery import Celery
from celery.schedules import crontab

from api.config import get_settings

settings = get_settings()

celery_app = Celery(
    "predictai",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["workers.tasks"],
)

celery_app.conf.beat_schedule = {
    "refresh-market-cache": {
        "task": "workers.tasks.refresh_market_cache",
        "schedule": 300.0,
    },
    "reset-weekly-leaderboard": {
        "task": "workers.tasks.reset_weekly_leaderboard",
        "schedule": crontab(hour=0, minute=0, day_of_week="monday"),
    },
    "check-price-alerts": {
        "task": "workers.tasks.check_price_alerts",
        "schedule": 60.0,
    },
    "reconcile-trade-orders": {
        "task": "workers.tasks.reconcile_trade_orders",
        "schedule": 90.0,
    },
}
celery_app.conf.timezone = "UTC"
