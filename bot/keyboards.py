from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from api.config import get_settings


def start_keyboard() -> InlineKeyboardMarkup:
    settings = get_settings()
    buttons = []
    if settings.mini_app_url:
        buttons.append([InlineKeyboardButton("Connect wallet", web_app=WebAppInfo(settings.mini_app_url))])
    buttons.append(
        [
            InlineKeyboardButton("Markets", callback_data="markets"),
            InlineKeyboardButton("Help", callback_data="help"),
        ]
    )
    return InlineKeyboardMarkup(buttons)


def market_actions_keyboard(market_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Analyze", callback_data=f"analyze:{market_id}"),
                InlineKeyboardButton("Bet", callback_data=f"bet:{market_id}"),
            ],
            [InlineKeyboardButton("View market", callback_data=f"market:{market_id}")],
        ]
    )
