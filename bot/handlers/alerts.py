from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from api.services.polymarket import PolymarketService
from bot.keyboards import alert_threshold_keyboard
from db.crud import create_alert, list_alerts
from db.models import SessionLocal

service = PolymarketService()


async def alerts_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    target = " ".join(context.args) if context.args else ""
    if not target:
        async with SessionLocal() as session:
            alerts = await list_alerts(session, update.effective_user.id)
        if not alerts:
            await update.effective_message.reply_text(
                "Alerts\n"
                "------\n"
                "No active alerts yet.\n\n"
                "Use /alerts [market id or keyword] to create one."
            )
            return
        lines = ["Active alerts", "-------------"]
        for alert in alerts[:10]:
            lines.extend(
                [
                    "",
                    alert.market_question[:80],
                    f"{alert.direction} {float(alert.threshold):.0f}%",
                ]
            )
        await update.effective_message.reply_text("\n".join(lines))
        return

    market = await service.get_market(target)
    if not market:
        results = await service.search_markets(target, limit=1)
        market = results[0] if results else None

    if not market:
        await update.effective_message.reply_text(f'No market found for "{target}".')
        return

    context.user_data["alert_market"] = market
    await update.effective_message.reply_text(
        "Set alert\n"
        "---------\n"
        f"{market['question']}\n\n"
        f"Current Yes probability: {market['probability']:.0f}%\n"
        "Notify me when probability crosses:",
        reply_markup=alert_threshold_keyboard(),
    )


async def alert_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    action = query.data

    if action == "alert_cancel":
        context.user_data.pop("alert_market", None)
        await query.edit_message_text("Alert cancelled.")
        return

    market = context.user_data.get("alert_market")
    if not market:
        await query.edit_message_text("Alert setup expired. Use /alerts [market] to start again.")
        return

    threshold = float(action.split(":", 1)[1])
    async with SessionLocal() as session:
        alert = await create_alert(
            session,
            telegram_id=query.from_user.id,
            username=query.from_user.username,
            market_id=market["id"],
            market_question=market["question"],
            threshold=threshold,
            direction="ABOVE",
        )

    context.user_data.pop("alert_market", None)
    await query.edit_message_text(
        "Alert set\n"
        "---------\n"
        f"{alert.market_question}\n"
        f"Notify when Yes probability crosses {float(alert.threshold):.0f}%."
    )
