from telegram import Update
from telegram.ext import ContextTypes

from bot.keyboards import start_keyboard
from bot.messages import HELP_TEXT, START_TEXT


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(START_TEXT, reply_markup=start_keyboard())


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(HELP_TEXT)


async def generic_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    if query.data == "markets":
        from bot.handlers.markets import markets_command

        await markets_command(update, context)
        return
    if query.data == "help":
        await query.edit_message_text(HELP_TEXT)
        return
    await query.edit_message_text("This flow is coming next. Try /markets or /analyze for the live demo.")
