import json
from urllib.parse import urlencode

from telegram import KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove, Update, WebAppInfo
from telegram.ext import ContextTypes

from api.config import get_settings
from api.services.wallets import get_usdc_balance, is_evm_address, short_address
from db.crud import add_wallet, disconnect_wallets, list_wallets
from db.models import SessionLocal


async def connect_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    settings = get_settings()
    if not settings.mini_app_url:
        await update.effective_message.reply_text(
            "Wallet connect is almost ready. Set MINI_APP_URL in Render, then redeploy the bot worker."
        )
        return

    await update.effective_message.reply_text(
        "Connect your wallet\nTap the keyboard button below to open the wallet connect screen.\n\nIf you are retrying after an update, use this fresh button.",
        reply_markup=_connect_wallet_keyboard_for_user(update.effective_user.id),
    )


async def wallets_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with SessionLocal() as session:
        wallets = await list_wallets(session, update.effective_user.id)

    if not wallets:
        await update.effective_message.reply_text(
            "No wallets connected yet.\n\nUse /connect to add one.",
            reply_markup=_connect_wallet_keyboard_for_user(update.effective_user.id),
        )
        return

    lines = ["Your wallets", "------------"]
    for wallet in wallets:
        marker = "*" if wallet.is_active else "-"
        balance = await get_usdc_balance(wallet.address)
        balance_text = f" - {balance:.2f} USDC" if balance is not None else ""
        active_text = " [Active]" if wallet.is_active else ""
        lines.append(f"{marker} {short_address(wallet.address)}{balance_text}{active_text}")
    lines.append("\n/connect - add wallet")
    lines.append("/disconnect - remove all wallets")
    await update.effective_message.reply_text("\n".join(lines))


async def disconnect_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with SessionLocal() as session:
        count = await disconnect_wallets(session, update.effective_user.id)
    if count == 0:
        await update.effective_message.reply_text("No wallets were connected.")
        return
    await update.effective_message.reply_text("Wallet disconnected. Your open positions are not affected.")


async def handle_web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    raw = update.effective_message.web_app_data.data
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        await update.effective_message.reply_text("Wallet connect data was invalid. Please try /connect again.")
        return

    if data.get("type") != "wallet_connected":
        await update.effective_message.reply_text("Unknown wallet connect response. Please try /connect again.")
        return

    address = str(data.get("address", "")).strip()
    if not is_evm_address(address):
        await update.effective_message.reply_text("That does not look like a valid EVM wallet address.")
        return

    connection_signature = str(data.get("connection_signature", "")).strip()
    async with SessionLocal() as session:
        wallet = await add_wallet(
            session,
            telegram_id=update.effective_user.id,
            username=update.effective_user.username,
            address=address,
        )

    balance = await get_usdc_balance(wallet.address)
    balance_text = f"\n\nUSDC balance: {balance:.2f}" if balance is not None else ""
    proof_text = "\nConnection signature received." if connection_signature else "\nConnection signature missing."
    await update.effective_message.reply_text(
        f"Wallet connected\n{short_address(wallet.address)}{proof_text}{balance_text}\n\nTry /markets or /wallets.",
        reply_markup=ReplyKeyboardRemove(),
    )


def _connect_wallet_keyboard_for_user(telegram_id: int) -> ReplyKeyboardMarkup:
    settings = get_settings()
    separator = "&" if "?" in settings.mini_app_url else "?"
    connect_url = f"{settings.mini_app_url}{separator}{urlencode({'telegram_id': telegram_id})}"
    return ReplyKeyboardMarkup(
        [[KeyboardButton("Open wallet connect", web_app=WebAppInfo(connect_url))]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
