from telegram import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo

from api.config import get_settings


def start_keyboard() -> InlineKeyboardMarkup:
    settings = get_settings()
    buttons = []
    if settings.mini_app_url:
        buttons.append([InlineKeyboardButton("Connect wallet", callback_data="connect")])
    buttons.append(
        [
            InlineKeyboardButton("Markets", callback_data="markets"),
            InlineKeyboardButton("Help", callback_data="help"),
        ]
    )
    return InlineKeyboardMarkup(buttons)


def connect_wallet_keyboard() -> InlineKeyboardMarkup:
    settings = get_settings()
    if not settings.mini_app_url:
        return InlineKeyboardMarkup([[InlineKeyboardButton("Mini App not configured", callback_data="help")]])
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("Open wallet connect", web_app=WebAppInfo(settings.mini_app_url))]]
    )


def connect_wallet_reply_keyboard() -> ReplyKeyboardMarkup:
    settings = get_settings()
    return ReplyKeyboardMarkup(
        [[KeyboardButton("Open wallet connect", web_app=WebAppInfo(settings.mini_app_url))]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def market_actions_keyboard(market_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Analyze", callback_data="analyze:selected"),
                InlineKeyboardButton("Bet", callback_data="bet:selected"),
            ],
            [InlineKeyboardButton("View market", callback_data="market:selected")],
        ]
    )


def bet_side_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Yes", callback_data="bet_side:YES"),
                InlineKeyboardButton("No", callback_data="bet_side:NO"),
            ],
            [InlineKeyboardButton("Cancel", callback_data="bet_cancel")],
        ]
    )


def bet_amount_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("$5", callback_data="bet_amount:5"),
                InlineKeyboardButton("$10", callback_data="bet_amount:10"),
                InlineKeyboardButton("$25", callback_data="bet_amount:25"),
                InlineKeyboardButton("$50", callback_data="bet_amount:50"),
            ],
            [InlineKeyboardButton("Cancel", callback_data="bet_cancel")],
        ]
    )


def bet_confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("Confirm demo bet", callback_data="bet_confirm")],
            [InlineKeyboardButton("Cancel", callback_data="bet_cancel")],
        ]
    )
