from telegram import Update
from telegram.ext import ContextTypes

from api.config import get_settings
from api.services.order_submission import PolymarketOrderSubmissionService
from bot.keyboards import status_keyboard
from db.crud import get_active_wallet, get_fast_trading_authorization
from db.models import SessionLocal


async def trading_status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    settings = get_settings()
    report = PolymarketOrderSubmissionService().readiness_report()
    telegram_id = update.effective_user.id if update.effective_user else update.callback_query.from_user.id
    async with SessionLocal() as session:
        wallet = await get_active_wallet(session, telegram_id)
        authorization = await get_fast_trading_authorization(session, telegram_id, wallet.address if wallet else None)
    enabled = "on" if report["live_submission_enabled"] else "off"
    ready = "ready" if report["ready"] else "not ready"
    fast_status = "enabled" if authorization else "not enabled"
    missing = report["missing_configuration"]
    lines = [
        "System status",
        "-------------",
        f"Live submission: {enabled}",
        f"Readiness: {ready}",
        f"Fast trading: {fast_status}",
        f"AI analysis: {'Gemini configured' if settings.gemini_api_key else 'Gemini missing'}",
        f"Polymarket host: {report['host']}",
        f"Chain: {report['chain_id']}",
        f"Signature type: {report['signature_type']}",
        f"Funder address: {'set' if report['has_funder_address'] else 'not set'}",
        f"USDC allowance spender: {'set' if report['has_usdc_spender'] else 'not set'}",
        "",
        report["message"],
    ]
    if missing:
        lines.extend(["", "Needs attention:", *[f"- {item}" for item in missing]])
    if update.callback_query:
        await update.callback_query.edit_message_text("\n".join(lines), reply_markup=status_keyboard())
        return
    await update.effective_message.reply_text("\n".join(lines), reply_markup=status_keyboard())
