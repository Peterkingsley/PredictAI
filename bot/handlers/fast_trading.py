from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import ContextTypes

from api.config import get_settings
from api.services.wallets import short_address
from db.crud import get_active_wallet, get_fast_trading_authorization, revoke_fast_trading_authorization
from db.models import SessionLocal


async def fast_trading_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _show_fast_trading(update, context)


async def fast_trading_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    if query.data == "fast_trading_disable":
        async with SessionLocal() as session:
            revoked = await revoke_fast_trading_authorization(session, query.from_user.id)
        text = "Fast trading disabled." if revoked else "Fast trading was not enabled."
        await query.edit_message_text(text, reply_markup=_fast_trading_keyboard(has_wallet=True, enabled=False, telegram_id=query.from_user.id))
        return
    await _show_fast_trading(update, context)


async def _show_fast_trading(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    telegram_id = update.effective_user.id if update.effective_user else update.callback_query.from_user.id
    async with SessionLocal() as session:
        wallet = await get_active_wallet(session, telegram_id)
        authorization = await get_fast_trading_authorization(session, telegram_id, wallet.address if wallet else None)

    if not wallet:
        text = (
            "Fast trading\n"
            "------------\n"
            "Connect a wallet first. Fast trading authorization is tied to your active wallet and Telegram account."
        )
        markup = _fast_trading_keyboard(has_wallet=False, enabled=False)
    elif authorization:
        text = (
            "Fast trading\n"
            "------------\n"
            "Status: enabled\n"
            f"Wallet: {short_address(authorization.wallet_address)}\n"
            f"Max order: {float(authorization.max_order_usdc):.2f} USDC\n"
            f"Daily limit: {float(authorization.daily_limit_usdc):.2f} USDC\n"
            f"Expires: {authorization.expires_at.date()}\n\n"
            "PredictAI will still ask for Telegram confirmation before any order."
        )
        markup = _fast_trading_keyboard(has_wallet=True, enabled=True)
    else:
        text = (
            "Fast trading\n"
            "------------\n"
            "Status: not enabled\n"
            f"Wallet: {short_address(wallet.address)}\n\n"
            "Enable it by signing one authorization message with clear limits. This does not share your private key."
        )
        markup = _fast_trading_keyboard(has_wallet=True, enabled=False, telegram_id=telegram_id)

    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=markup)
        return
    await update.effective_message.reply_text(text, reply_markup=markup)


def _fast_trading_keyboard(has_wallet: bool, enabled: bool, telegram_id: int | None = None) -> InlineKeyboardMarkup:
    settings = get_settings()
    rows = []
    if has_wallet and not enabled and settings.mini_app_url:
        url = settings.mini_app_url
        if telegram_id is not None:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}telegram_id={telegram_id}"
        rows.append([InlineKeyboardButton("Open fast trading setup", web_app=WebAppInfo(url))])
    if enabled:
        rows.append([InlineKeyboardButton("Disable fast trading", callback_data="fast_trading_disable")])
    rows.append(
        [
            InlineKeyboardButton("Wallet", callback_data="wallets"),
            InlineKeyboardButton("Home", callback_data="home"),
        ]
    )
    return InlineKeyboardMarkup(rows)
