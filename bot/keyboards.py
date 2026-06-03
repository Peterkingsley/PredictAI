from urllib.parse import urlencode

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from api.config import get_settings


def dashboard_keyboard(has_wallet: bool = False) -> InlineKeyboardMarkup:
    wallet_label = "Wallet" if has_wallet else "Connect wallet"
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Markets", callback_data="markets"),
                InlineKeyboardButton("New", callback_data="new"),
            ],
            [
                InlineKeyboardButton("Search", callback_data="search_help"),
                InlineKeyboardButton("Orders", callback_data="orders"),
            ],
            [
                InlineKeyboardButton(wallet_label, callback_data="wallets" if has_wallet else "connect"),
                InlineKeyboardButton("Portfolio", callback_data="portfolio"),
            ],
            [
                InlineKeyboardButton("Status", callback_data="status"),
                InlineKeyboardButton("Help", callback_data="help"),
            ],
        ]
    )


def home_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[InlineKeyboardButton("Home", callback_data="home")]])


def recovery_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Markets", callback_data="markets"),
                InlineKeyboardButton("Search", callback_data="search_help"),
            ],
            [InlineKeyboardButton("Home", callback_data="home")],
        ]
    )


def status_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Orders", callback_data="orders"),
                InlineKeyboardButton("Wallet", callback_data="wallets"),
            ],
            [InlineKeyboardButton("Home", callback_data="home")],
        ]
    )


def start_keyboard(has_wallet: bool = False) -> InlineKeyboardMarkup:
    return dashboard_keyboard(has_wallet=has_wallet)


def help_menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Markets", callback_data="help:markets"),
                InlineKeyboardButton("Trading", callback_data="help:trading"),
            ],
            [
                InlineKeyboardButton("Wallet", callback_data="help:wallet"),
                InlineKeyboardButton("Orders", callback_data="help:orders"),
            ],
            [
                InlineKeyboardButton("Alerts", callback_data="help:alerts"),
                InlineKeyboardButton("Status", callback_data="help:status"),
            ],
            [InlineKeyboardButton("Home", callback_data="home")],
        ]
    )


def help_section_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("Back to help", callback_data="help")],
            [InlineKeyboardButton("Home", callback_data="home")],
        ]
    )


def wallet_actions_keyboard(has_wallet: bool = False) -> InlineKeyboardMarkup:
    settings = get_settings()
    buttons: list[list[InlineKeyboardButton]] = []
    if settings.mini_app_url:
        buttons.append([InlineKeyboardButton("Connect wallet", callback_data="connect")])
    if has_wallet:
        buttons.append([InlineKeyboardButton("Browse markets", callback_data="markets")])
    buttons.append(
        [
            InlineKeyboardButton("Orders", callback_data="orders"),
            InlineKeyboardButton("Home", callback_data="home"),
        ]
    )
    return InlineKeyboardMarkup(buttons)


def connect_wallet_keyboard(telegram_id: int | None = None) -> InlineKeyboardMarkup:
    settings = get_settings()
    if not settings.mini_app_url:
        return InlineKeyboardMarkup([[InlineKeyboardButton("Mini App not configured", callback_data="help")]])
    connect_url = settings.mini_app_url
    if telegram_id is not None:
        separator = "&" if "?" in connect_url else "?"
        connect_url = f"{connect_url}{separator}{urlencode({'telegram_id': telegram_id})}"
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("Open wallet connect", web_app=WebAppInfo(connect_url))],
            [InlineKeyboardButton("Home", callback_data="home")],
        ]
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
    rows.append(
        [
            InlineKeyboardButton("Search", callback_data="search_help"),
            InlineKeyboardButton("Home", callback_data="home"),
        ]
    )
    return InlineKeyboardMarkup(rows)


def market_actions_keyboard(market_id: str, include_back: bool = False) -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton("Prepare bet", callback_data="bet:selected"),
            InlineKeyboardButton("Analyze", callback_data="analyze:selected"),
        ],
        [InlineKeyboardButton("Alert", callback_data="alert_market:selected")],
    ]
    if include_back:
        rows.append([InlineKeyboardButton("Back to results", callback_data="market_back")])
    return InlineKeyboardMarkup(rows)


def analysis_result_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Prepare bet", callback_data="bet:selected"),
                InlineKeyboardButton("Alert", callback_data="alert_market:selected"),
            ],
            [
                InlineKeyboardButton("Market", callback_data="market:selected"),
                InlineKeyboardButton("Home", callback_data="home"),
            ],
        ]
    )


def alert_result_keyboard(include_market: bool = True) -> InlineKeyboardMarkup:
    rows = []
    if include_market:
        rows.append(
            [
                InlineKeyboardButton("Prepare bet", callback_data="bet:selected"),
                InlineKeyboardButton("Market", callback_data="market:selected"),
            ]
        )
    rows.append(
        [
            InlineKeyboardButton("Markets", callback_data="markets"),
            InlineKeyboardButton("Home", callback_data="home"),
        ]
    )
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
            [InlineKeyboardButton("Custom amount", callback_data="bet_amount_custom")],
            [
                InlineKeyboardButton("Back", callback_data="bet_back_side"),
                InlineKeyboardButton("Cancel", callback_data="bet_cancel"),
            ],
        ]
    )


def bet_confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("Continue to signing", callback_data="bet_confirm")],
            [
                InlineKeyboardButton("Back", callback_data="bet_back_amount"),
                InlineKeyboardButton("Cancel", callback_data="bet_cancel"),
            ],
        ]
    )


def bet_blocked_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("Choose amount", callback_data="bet_back_amount")],
            [
                InlineKeyboardButton("Market", callback_data="market:selected"),
                InlineKeyboardButton("Status", callback_data="status"),
            ],
            [InlineKeyboardButton("Cancel", callback_data="bet_cancel")],
        ]
    )


def orders_dashboard_keyboard(orders: list) -> InlineKeyboardMarkup:
    rows = []
    for order in orders[:10]:
        rows.append([InlineKeyboardButton(f"Order #{order.id}", callback_data=f"order_detail:{order.id}")])
    rows.append(
        [
            InlineKeyboardButton("Sync orders", callback_data="order_sync_all"),
            InlineKeyboardButton("Home", callback_data="home"),
        ]
    )
    return InlineKeyboardMarkup(rows)


def order_actions_keyboard(order) -> InlineKeyboardMarkup:
    rows = []
    if order.status in {"SIGNED", "SIGNED_PENDING_SUBMISSION", "FAILED", "CONFIGURATION_MISSING"}:
        rows.append([InlineKeyboardButton("Retry", callback_data=f"order_retry:{order.id}")])
    if order.status in {"SUBMITTED", "OPEN", "PARTIALLY_FILLED"}:
        rows.append(
            [
                InlineKeyboardButton("Sync", callback_data="order_sync_all"),
                InlineKeyboardButton("Cancel", callback_data=f"order_cancel:{order.id}"),
            ]
        )
    rows.append(
        [
            InlineKeyboardButton("Back to orders", callback_data="order_back"),
            InlineKeyboardButton("Home", callback_data="home"),
        ]
    )
    return InlineKeyboardMarkup(rows)


def order_result_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("Back to orders", callback_data="order_back")],
            [InlineKeyboardButton("Home", callback_data="home")],
        ]
    )


def portfolio_keyboard(positions: list) -> InlineKeyboardMarkup:
    rows = []
    for position in positions[:10]:
        rows.append([InlineKeyboardButton(f"Position #{position.id}", callback_data=f"position_detail:{position.id}")])
    rows.append(
        [
            InlineKeyboardButton("P&L", callback_data="portfolio_pnl"),
            InlineKeyboardButton("Home", callback_data="home"),
        ]
    )
    return InlineKeyboardMarkup(rows)


def portfolio_result_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("Back to portfolio", callback_data="portfolio_back")],
            [InlineKeyboardButton("Home", callback_data="home")],
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
            [
                InlineKeyboardButton("Back to portfolio", callback_data="portfolio_back"),
                InlineKeyboardButton("Home", callback_data="home"),
            ],
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
