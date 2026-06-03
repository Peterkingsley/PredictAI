from telegram import Update
from telegram.ext import ContextTypes

from api.services.order_submission import PolymarketOrderSubmissionService
from bot.keyboards import status_keyboard


async def trading_status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    report = PolymarketOrderSubmissionService().readiness_report()
    enabled = "on" if report["live_submission_enabled"] else "off"
    ready = "ready" if report["ready"] else "not ready"
    missing = report["missing_configuration"]
    lines = [
        "System status",
        "-------------",
        f"Live submission: {enabled}",
        f"Readiness: {ready}",
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
