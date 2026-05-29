from telegram import Update
from telegram.ext import ContextTypes


async def portfolio_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        "Your portfolio\n"
        "--------------\n"
        "Position tracking is scaffolded. Wallet connect and real positions come after Phase 1 live market browsing."
    )
