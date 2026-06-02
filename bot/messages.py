from typing import Any

START_TEXT = (
    "Welcome to PredictAI\n"
    "Browse live prediction markets, get AI analysis, connect your wallet, and prepare Polymarket orders from Telegram.\n\n"
    "Quick start:\n"
    "/markets\n"
    "/search fed\n"
    "/analyze bitcoin\n"
    "/help"
)

HELP_TEXT = (
    "All commands\n"
    "------------\n"
    "Markets\n"
    "/markets - top markets\n"
    "/markets [category] - filter by category\n"
    "/new - recent markets\n"
    "/search [keyword] - search markets\n"
    "/market [id] - market detail\n\n"
    "Analysis\n"
    "/analyze [market id or keyword] - AI report\n"
    "/quick [market id or keyword] - quick read\n"
    "/alerts [market id or keyword] - set probability alert\n\n"
    "Trading\n"
    "/bet [market id or keyword] - prepare a Polymarket order\n"
    "/portfolio - view positions\n"
    "/history - past orders\n"
    "/pnl - P&L snapshot\n\n"
    "Account\n"
    "/connect - connect wallet\n"
    "/wallets - list wallets\n"
    "/disconnect - remove wallets"
)


def format_market_list(title: str, markets: list[dict[str, Any]]) -> str:
    lines = [f"{title} - live Polymarket data", ""]
    for index, market in enumerate(markets[:10], start=1):
        lines.extend(
            [
                f"{index}. {market['question']}",
                f"{market['category']} - {market['probability']:.0f}% Yes - ${market['volume']:,.0f} vol",
                f"ID: {market['id']}",
                "",
            ]
        )
    return "\n".join(lines).strip()


def format_market_detail(market: dict[str, Any]) -> str:
    return (
        f"{market['question']}\n"
        "----------------------\n"
        f"Category: {market['category']}\n"
        f"Probability: {market['probability']:.0f}%\n"
        f"Volume: ${market['volume']:,.0f}\n"
        f"Closes: {market.get('end_date') or 'Unknown'}\n\n"
        f"Yes best price: ${market['yes_price']:.2f}\n"
        f"No best price: ${market['no_price']:.2f}"
    )
