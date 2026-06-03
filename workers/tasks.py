import asyncio
import json
import logging

from redis import Redis
from telegram import Bot

from api.config import get_settings
from api.services.order_submission import OrderSubmissionError, PolymarketOrderSubmissionService
from api.services.polymarket import PolymarketService
from db.crud import (
    list_syncable_trade_orders_with_users,
    list_untriggered_alerts,
    mark_alert_triggered,
    update_trade_order_sync,
    upsert_position_from_trade_order,
)
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


@celery_app.task
def reconcile_trade_orders() -> dict:
    return asyncio.run(_reconcile_trade_orders())


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


async def _reconcile_trade_orders() -> dict:
    settings = get_settings()
    await init_db()
    service = PolymarketOrderSubmissionService()
    bot = Bot(settings.telegram_bot_token) if settings.telegram_bot_token else None
    checked = 0
    changed = 0
    notified = 0
    errors = 0

    async with SessionLocal() as session:
        orders = await list_syncable_trade_orders_with_users(session, limit=50)
        for order, telegram_id in orders:
            checked += 1
            previous_status = order.status
            try:
                remote = service.fetch_order_status(order.polymarket_order_id)
                updated = await update_trade_order_sync(session, order, remote["status"], remote["raw_response"])
                position = await upsert_position_from_trade_order(session, updated)
            except OrderSubmissionError:
                logger.exception("Order reconciliation failed for trade order %s", order.id)
                errors += 1
                continue

            if updated.status == previous_status:
                continue
            changed += 1
            if not bot:
                continue
            try:
                await bot.send_message(
                    chat_id=telegram_id,
                    text=_format_order_status_change(updated, previous_status, position),
                )
                notified += 1
            except Exception:
                logger.exception("Failed to notify Telegram user %s for order %s", telegram_id, updated.id)

    return {
        "checked": checked,
        "changed": changed,
        "notified": notified,
        "errors": errors,
    }


def _format_order_status_change(order, previous_status: str, position) -> str:
    lines = [
        "Order status updated",
        "--------------------",
        f"Order #{order.id}",
        f"{_status_label(previous_status)} -> {_status_label(order.status)}",
        order.market_question[:120],
        "",
        f"{order.order_type} {order.side} - {float(order.amount_usdc):.2f} USDC",
        f"Polymarket order: {order.polymarket_order_id or '-'}",
    ]
    if position:
        lines.extend(["", f"Portfolio position #{position.id} updated."])
    lines.extend(["", _next_action(order), f"/order_{order.id}"])
    return "\n".join(lines)


def _status_label(status: str) -> str:
    labels = {
        "SUBMITTED": "Submitted",
        "OPEN": "Open",
        "PARTIALLY_FILLED": "Partially filled",
        "FILLED": "Filled",
        "CANCELLED": "Cancelled",
        "FAILED": "Failed",
        "EXPIRED": "Expired",
    }
    return labels.get(status, status.replace("_", " ").title())


def _next_action(order) -> str:
    actions = {
        "OPEN": f"Still live. Use /cancel_order {order.id} if you want to cancel.",
        "PARTIALLY_FILLED": f"Partially filled. Use /cancel_order {order.id} to cancel the remaining size.",
        "FILLED": "Filled and reflected in your portfolio.",
        "CANCELLED": "Cancelled. No further action needed.",
        "FAILED": f"Review the failure and use /retry_order {order.id} after fixing it.",
        "EXPIRED": "Expired. Create a new order if you still want this position.",
    }
    return actions.get(order.status, "Use /orders for your order dashboard.")
