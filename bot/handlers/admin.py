from telegram import Update
from telegram.ext import ContextTypes

from api.config import get_settings
from api.services.order_submission import PolymarketOrderSubmissionService
from bot.keyboards import home_keyboard
from db.crud import admin_health_counts, get_user_by_telegram_id, list_delegated_admins, set_delegated_admin
from db.models import SessionLocal


async def admin_status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_admin(update.effective_user.id):
        await _deny(update)
        return

    report = PolymarketOrderSubmissionService().readiness_report()
    async with SessionLocal() as session:
        counts = await admin_health_counts(session)
        delegated_admins = await list_delegated_admins(session)

    lines = [
        "Admin status",
        "------------",
        f"Live trading: {'on' if report['live_submission_enabled'] else 'off'}",
        f"Readiness: {'ready' if report['ready'] else 'not ready'}",
        f"Host: {report['host']}",
        f"Missing config: {', '.join(report['missing_configuration']) or 'none'}",
        "",
        "Operations",
        f"Users: {counts['users']}",
        f"Active alerts: {counts['active_alerts']}",
        f"Orders needing sync: {counts['syncable_orders']}",
        f"Orders pending retry: {counts['pending_retries']}",
        "",
        "Order statuses",
        _format_status_counts(counts["order_status_counts"]),
        "",
        "Admins",
        f"Root admins: {_root_admin_count()}",
        f"Delegated admins: {len(delegated_admins)}",
        "",
        "Commands",
        "/admin_grant [telegram_id]",
        "/admin_revoke [telegram_id]",
        "/admin_list",
    ]
    await update.effective_message.reply_text("\n".join(lines), reply_markup=home_keyboard())


async def admin_grant_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_admin(update.effective_user.id):
        await _deny(update)
        return
    target = _target_telegram_id(context)
    if not target:
        await update.effective_message.reply_text("Usage: /admin_grant [telegram_id]", reply_markup=home_keyboard())
        return
    async with SessionLocal() as session:
        await set_delegated_admin(session, target, True, granted_by=update.effective_user.id)
    await update.effective_message.reply_text(f"Admin access granted to Telegram ID {target}.", reply_markup=home_keyboard())


async def admin_revoke_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_admin(update.effective_user.id):
        await _deny(update)
        return
    target = _target_telegram_id(context)
    if not target:
        await update.effective_message.reply_text("Usage: /admin_revoke [telegram_id]", reply_markup=home_keyboard())
        return
    if target in _root_admin_ids():
        await update.effective_message.reply_text(
            "Root admins come from ADMIN_TELEGRAM_IDS and cannot be revoked from Telegram.",
            reply_markup=home_keyboard(),
        )
        return
    async with SessionLocal() as session:
        await set_delegated_admin(session, target, False, granted_by=update.effective_user.id)
    await update.effective_message.reply_text(f"Admin access revoked for Telegram ID {target}.", reply_markup=home_keyboard())


async def admin_list_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_admin(update.effective_user.id):
        await _deny(update)
        return
    async with SessionLocal() as session:
        delegated_admins = await list_delegated_admins(session)
    lines = ["Admin access", "------------", f"Root: {', '.join(map(str, sorted(_root_admin_ids()))) or 'none'}"]
    if delegated_admins:
        lines.append("Delegated:")
        lines.extend(f"- {user.telegram_id}" for user in delegated_admins)
    else:
        lines.append("Delegated: none")
    await update.effective_message.reply_text("\n".join(lines), reply_markup=home_keyboard())


async def _is_admin(telegram_id: int) -> bool:
    if telegram_id in _root_admin_ids():
        return True
    async with SessionLocal() as session:
        user = await get_user_by_telegram_id(session, telegram_id)
    return bool(user and (user.settings or {}).get("is_admin"))


async def _deny(update: Update) -> None:
    await update.effective_message.reply_text("Admin access required.", reply_markup=home_keyboard())


def _root_admin_ids() -> set[int]:
    values = get_settings().admin_telegram_ids.split(",")
    return {int(value.strip()) for value in values if value.strip().isdigit()}


def _root_admin_count() -> int:
    return len(_root_admin_ids())


def _target_telegram_id(context: ContextTypes.DEFAULT_TYPE) -> int | None:
    if not context.args:
        return None
    try:
        return int(context.args[0])
    except ValueError:
        return None


def _format_status_counts(counts: dict) -> str:
    if not counts:
        return "none"
    return " | ".join(f"{status}: {count}" for status, count in sorted(counts.items()))
