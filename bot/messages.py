from typing import Any

START_TEXT = (
    "PredictAI home\n"
    "--------------\n"
    "Browse live prediction markets, get AI analysis, connect a wallet, and prepare Polymarket orders from Telegram."
)

HELP_TEXT = (
    "Help menu\n"
    "---------\n"
    "Choose what you want to do. Most common actions now work from buttons inside chat."
)

HELP_SECTIONS = {
    "markets": (
        "Markets\n"
        "-------\n"
        "Use Markets for popular live markets, New for recent markets, or Search when you know what you want.\n\n"
        "Power commands:\n"
        "/markets\n"
        "/markets [category]\n"
        "/new\n"
        "/search [keyword]\n"
        "/market [id]"
    ),
    "trading": (
        "Trading\n"
        "-------\n"
        "Open a market, tap Bet, choose Yes or No, select an amount, then review before signing. Wallet approval still happens in the Mini App.\n\n"
        "Power command:\n"
        "/bet [market id or keyword]"
    ),
    "wallet": (
        "Wallet\n"
        "------\n"
        "Connect a Polygon wallet before preparing orders. PredictAI never asks for private keys.\n\n"
        "Power commands:\n"
        "/connect\n"
        "/wallets\n"
        "/disconnect"
    ),
    "orders": (
        "Orders\n"
        "------\n"
        "Orders show signed requests, submitted orders, fills, failures, and the next action.\n\n"
        "Power commands:\n"
        "/orders\n"
        "/sync_orders\n"
        "/retry_order [id]\n"
        "/cancel_order [id]\n"
        "/portfolio\n"
        "/history\n"
        "/pnl"
    ),
    "alerts": (
        "Alerts\n"
        "------\n"
        "Open a market and tap Alert, or create one by keyword. Alerts notify when Yes probability crosses your threshold.\n\n"
        "Power command:\n"
        "/alerts [market id or keyword]"
    ),
    "status": (
        "Status\n"
        "------\n"
        "Status checks whether live order submission is enabled and whether required trading configuration is present.\n\n"
        "Power commands:\n"
        "/status\n"
        "/admin_status"
    ),
}


def format_market_list(title: str, markets: list[dict[str, Any]]) -> str:
    lines = [title, "Live Polymarket markets", ""]
    for index, market in enumerate(markets[:10], start=1):
        closes = market.get("end_date") or "close unknown"
        lines.extend(
            [
                f"{index}. {market['question']}",
                (
                    f"Yes {market['probability']:.0f}% | "
                    f"${float(market.get('volume') or 0):,.0f} vol | "
                    f"{closes}"
                ),
                "",
            ]
        )
    lines.append("Tap a number below to view details and prepare an order.")
    return "\n".join(lines).strip()


def format_market_detail(market: dict[str, Any]) -> str:
    status = "Active" if market.get("active", True) else "Inactive"
    return (
        f"{market['question']}\n"
        "--------------------\n"
        f"Status: {status}\n"
        f"Category: {market['category']}\n"
        f"Probability: {market['probability']:.0f}% Yes\n"
        f"Yes price: ${market['yes_price']:.2f}\n"
        f"No price: ${market['no_price']:.2f}\n"
        f"Volume: ${float(market.get('volume') or 0):,.0f}\n"
        f"Closes: {market.get('end_date') or 'Unknown'}\n\n"
        "Choose an action below."
    )
