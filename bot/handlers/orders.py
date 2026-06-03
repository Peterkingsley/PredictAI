from telegram import Update
from telegram.ext import ContextTypes

from api.services.wallets import short_address
from api.services.order_submission import OrderSubmissionError, PolymarketOrderSubmissionService
from db.crud import (
    get_signing_intent_for_trade_order,
    get_trade_order,
    list_syncable_trade_orders,
    list_trade_orders,
    update_trade_order_retry,
    update_trade_order_sync,
    update_trade_order_cancellation,
    upsert_position_from_trade_order,
)
from db.models import SessionLocal

RETRYABLE_ORDER_STATUSES = {"SIGNED", "SIGNED_PENDING_SUBMISSION", "FAILED", "CONFIGURATION_MISSING"}


async def orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with SessionLocal() as session:
        orders = await list_trade_orders(session, update.effective_user.id, limit=10)

    if not orders:
        await update.effective_message.reply_text(
            "Orders\n"
            "------\n"
            "No signed orders yet.\n\nUse /bet [market] to prepare one."
        )
        return

    counts = _order_status_counts(orders)
    lines = [
        "Order dashboard",
        "---------------",
        _format_counts(counts),
        "",
        "Use /sync_orders to refresh live Polymarket statuses.",
    ]
    for order in orders:
        lines.extend(
            [
                "",
                f"#{order.id} {_status_label(order.status)}",
                order.market_question[:72],
                f"{order.order_type} {order.side} - {float(order.amount_usdc):.2f} USDC",
                f"Limit ${float(order.limit_price):.4f} - Shares {float(order.shares):.2f}",
                f"{_next_action(order)} /order_{order.id}",
            ]
        )
    await update.effective_message.reply_text("\n".join(lines))


async def order_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    command = update.effective_message.text.split()[0]
    try:
        order_id = int(command.rsplit("_", 1)[1])
    except (IndexError, ValueError):
        await update.effective_message.reply_text("Usage: /order_[id]")
        return

    async with SessionLocal() as session:
        order = await get_trade_order(session, update.effective_user.id, order_id)
    if not order:
        await update.effective_message.reply_text("Order not found.")
        return

    await update.effective_message.reply_text(_format_order_detail(order))


async def sync_orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    service = PolymarketOrderSubmissionService()
    synced = []
    errors = []
    async with SessionLocal() as session:
        orders = await list_syncable_trade_orders(session, telegram_id=update.effective_user.id, limit=10)
        for order in orders:
            try:
                previous_status = order.status
                remote = service.fetch_order_status(order.polymarket_order_id)
                updated = await update_trade_order_sync(session, order, remote["status"], remote["raw_response"])
                position = await upsert_position_from_trade_order(session, updated)
                synced.append((updated, previous_status, position))
            except OrderSubmissionError as exc:
                errors.append(f"#{order.id}: {exc}")

    lines = [
        "Order reconciliation",
        "--------------------",
        f"Checked: {len(synced)}",
        f"Errors: {len(errors)}",
    ]
    if not synced and not errors:
        lines.append("No submitted/open Polymarket orders need syncing.")
    if synced:
        lines.append("")
        for order, previous_status, position in synced:
            changed = "updated" if order.status != previous_status else "unchanged"
            lines.append(f"#{order.id} {_status_label(order.status)} ({changed} from {previous_status})")
            lines.append(f"Action: {_next_action(order)}")
            if position:
                lines.append(f"Portfolio: position #{position.id} updated.")
    if errors:
        lines.extend(["", "Sync issues:", *errors[:5], "Try again later, or use /status if failures continue."])
    await update.effective_message.reply_text("\n".join(lines))


async def cancel_order_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.effective_message.reply_text("Usage: /cancel_order [order id]")
        return
    try:
        order_id = int(context.args[0])
    except ValueError:
        await update.effective_message.reply_text("Order ID must be a number.")
        return

    service = PolymarketOrderSubmissionService()
    async with SessionLocal() as session:
        order = await get_trade_order(session, update.effective_user.id, order_id)
        if not order:
            await update.effective_message.reply_text("Order not found.")
            return
        if order.status not in {"SUBMITTED", "OPEN", "PARTIALLY_FILLED"}:
            await update.effective_message.reply_text(
                f"Order #{order.id} is not cancellable because status is {_status_label(order.status)}.\n"
                f"Next: {_next_action(order)}"
            )
            return
        try:
            cancellation = service.cancel_order(order.polymarket_order_id)
            updated = await update_trade_order_cancellation(session, order, cancellation["raw_response"])
        except OrderSubmissionError as exc:
            await update.effective_message.reply_text(f"Cancel failed\n-------------\n{exc}")
            return

    await update.effective_message.reply_text(
        "Order cancelled\n"
        "---------------\n"
        f"Order #{updated.id}\n"
        f"{updated.market_question[:80]}\n\n"
        "This order will no longer fill. Use /orders to review your dashboard."
    )


async def retry_order_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.effective_message.reply_text("Usage: /retry_order [order id]")
        return
    try:
        order_id = int(context.args[0])
    except ValueError:
        await update.effective_message.reply_text("Order ID must be a number.")
        return

    service = PolymarketOrderSubmissionService()
    async with SessionLocal() as session:
        result = await get_signing_intent_for_trade_order(session, update.effective_user.id, order_id)
        if not result:
            await update.effective_message.reply_text("Order not found.")
            return
        order, intent = result
        if order.status not in RETRYABLE_ORDER_STATUSES:
            await update.effective_message.reply_text(
                f"Order #{order.id} is not retryable because status is {_status_label(order.status)}.\n"
                f"Next: {_next_action(order)}"
            )
            return
        if not intent.signature:
            await update.effective_message.reply_text("This order has no verified wallet signature yet, so it cannot be retried.")
            return
        try:
            submission = service.submit_verified_intent(intent).as_dict()
            updated = await update_trade_order_retry(session, intent, order, submission)
        except OrderSubmissionError as exc:
            await update.effective_message.reply_text(
                "Retry failed\n"
                "------------\n"
                f"{exc}\n\n"
                "Run /status to verify live submission settings, then retry again."
            )
            return

    await update.effective_message.reply_text(
        "Order retry complete\n"
        "--------------------\n"
        f"Order #{updated.id}\n"
        f"Status: {_status_label(updated.status)}\n"
        f"Polymarket order: {updated.polymarket_order_id or '-'}\n\n"
        f"Next: {_next_action(updated)}"
    )


def _format_order_detail(order) -> str:
    submission = order.submission or {}
    message = submission.get("message") or "-"
    polymarket_id = order.polymarket_order_id or "-"
    remote_status = submission.get("remote_status")
    synced_at = submission.get("synced_at")
    return (
        f"Order #{order.id}\n"
        "--------\n"
        f"{order.market_question}\n\n"
        f"Type: {order.order_type}\n"
        f"Side: {order.side}\n"
        f"Status: {_status_label(order.status)}\n"
        f"Wallet: {short_address(order.wallet_address)}\n"
        f"Amount: {float(order.amount_usdc):.2f} USDC\n"
        f"Shares: {float(order.shares):.2f}\n"
        f"Limit: ${float(order.limit_price):.4f}\n"
        f"Signing request: #{order.signing_intent_id}\n"
        f"Polymarket order: {polymarket_id}\n\n"
        f"Submission: {message}\n"
        f"Remote status: {remote_status or '-'}\n"
        f"Last sync: {synced_at or '-'}\n\n"
        f"Next: {_next_action(order)}"
    )


def _order_status_counts(orders) -> dict[str, int]:
    counts = {}
    for order in orders:
        counts[order.status] = counts.get(order.status, 0) + 1
    return counts


def _format_counts(counts: dict[str, int]) -> str:
    if not counts:
        return "No orders yet."
    ordered_statuses = [
        "SIGNED_PENDING_SUBMISSION",
        "CONFIGURATION_MISSING",
        "FAILED",
        "SUBMITTED",
        "OPEN",
        "PARTIALLY_FILLED",
        "FILLED",
        "CANCELLED",
    ]
    parts = [f"{_status_label(status)}: {counts[status]}" for status in ordered_statuses if counts.get(status)]
    parts.extend(f"{_status_label(status)}: {count}" for status, count in counts.items() if status not in ordered_statuses)
    return " | ".join(parts)


def _status_label(status: str) -> str:
    labels = {
        "SIGNED": "Signed",
        "SIGNED_PENDING_SUBMISSION": "Signed - waiting for live submission",
        "SUBMITTED": "Submitted",
        "OPEN": "Open",
        "PARTIALLY_FILLED": "Partially filled",
        "FILLED": "Filled",
        "CANCELLED": "Cancelled",
        "FAILED": "Failed",
        "CONFIGURATION_MISSING": "Configuration missing",
        "EXPIRED": "Expired",
    }
    return labels.get(status, status.replace("_", " ").title())


def _next_action(order) -> str:
    actions = {
        "SIGNED": "Waiting for backend submission.",
        "SIGNED_PENDING_SUBMISSION": f"Enable live submission, then use /retry_order {order.id}.",
        "SUBMITTED": "Run /sync_orders to confirm whether it is open or filled.",
        "OPEN": f"Still live. Use /cancel_order {order.id} if you want to cancel.",
        "PARTIALLY_FILLED": f"Partially filled. Use /cancel_order {order.id} to cancel the remaining size.",
        "FILLED": "Filled and reflected in portfolio after sync.",
        "CANCELLED": "Cancelled. No further action needed.",
        "FAILED": f"Review the failure message, then use /retry_order {order.id} after fixing it.",
        "CONFIGURATION_MISSING": f"Run /status, complete missing config, then use /retry_order {order.id}.",
        "EXPIRED": "Expired. Try a new order if you still want this position.",
    }
    return actions.get(order.status, "Use /sync_orders for the latest status.")
