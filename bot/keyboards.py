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


def market_results_keyboard(markets: list[dict], include_back: bool = False) -> InlineKeyboardMarkup:
    rows = []
    for start in range(0, min(len(markets), 10), 5):
        rows.append(
            [
                InlineKeyboardButton(str(index + 1), callback_data=f"market_pick:{index}")
                for index in range(start, min(start + 5, min(len(markets), 10)))
            ]
        )
    if include_back:
        rows.append([InlineKeyboardButton("Back to results", callback_data="market_back")])
    return InlineKeyboardMarkup(rows)


def market_actions_keyboard(market_id: str, include_back: bool = False) -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton("Bet", callback_data="bet:selected"),
            InlineKeyboardButton("Analyze", callback_data="analyze:selected"),
        ],
        [InlineKeyboardButton("Alert", callback_data="alert_market:selected")],
    ]
    if include_back:
        rows.append([InlineKeyboardButton("Back to results", callback_data="market_back")])
    return InlineKeyboardMarkup(rows)


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
            [InlineKeyboardButton("Confirm order", callback_data="bet_confirm")],
            [InlineKeyboardButton("Cancel", callback_data="bet_cancel")],
        ]
    )


def position_actions_keyboard(position_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Details", callback_data=f"position_detail:{position_id}"),
                InlineKeyboardButton("Sell", callback_data=f"position_sell:{position_id}"),
            ],
            [InlineKeyboardButton("Share", callback_data=f"position_share:{position_id}")],
        ]
    )


def alert_threshold_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("50%", callback_data="alert_threshold:50"),
                InlineKeyboardButton("60%", callback_data="alert_threshold:60"),
                InlineKeyboardButton("70%", callback_data="alert_threshold:70"),
                InlineKeyboardButton("80%", callback_data="alert_threshold:80"),
            ],
            [InlineKeyboardButton("Cancel", callback_data="alert_cancel")],
        ]
    )
