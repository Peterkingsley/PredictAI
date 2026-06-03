import json

from telegram import Update
from telegram.ext import ContextTypes

from api.config import get_settings
from api.services.wallets import get_usdc_balance, is_evm_address, short_address
from bot.keyboards import connect_wallet_keyboard, wallet_actions_keyboard
from db.crud import add_wallet, disconnect_wallets, list_wallets
from db.models import SessionLocal


async def connect_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    settings = get_settings()
    if not settings.mini_app_url:
        await update.effective_message.reply_text(
            "Wallet connect is almost ready. Set MINI_APP_URL in Render, then redeploy the bot worker."
        )
        return

    text = (
        "Connect your wallet\n"
        "-------------------\n"
        "Open the wallet connect screen, choose your Polygon wallet, then return to Telegram.\n\n"
        "PredictAI never asks for private keys."
    )
    reply_markup = connect_wallet_keyboard(update.effective_user.id)
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup)
        return
    await update.effective_message.reply_text(text, reply_markup=reply_markup)


async def wallets_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with SessionLocal() as session:
        wallets = await list_wallets(session, update.effective_user.id)

    if not wallets:
        await update.effective_message.reply_text(
            "No wallets connected yet.\n\nTap below to connect one.",
            reply_markup=connect_wallet_keyboard(update.effective_user.id),
        )
        return

    lines = ["Your wallets", "------------"]
    for wallet in wallets:
        marker = "*" if wallet.is_active else "-"
        balance = await get_usdc_balance(wallet.address)
        balance_text = f" - {balance:.2f} USDC" if balance is not None else ""
        active_text = " [Active]" if wallet.is_active else ""
        lines.append(f"{marker} {short_address(wallet.address)}{balance_text}{active_text}")
    lines.append("\nChoose an action below.")
    await update.effective_message.reply_text("\n".join(lines), reply_markup=wallet_actions_keyboard(has_wallet=True))


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
        f"Wallet connected\n"
        f"----------------\n"
        f"{short_address(wallet.address)}{proof_text}{balance_text}\n\n"
        "Choose what to do next.",
        reply_markup=wallet_actions_keyboard(has_wallet=True),
    )
