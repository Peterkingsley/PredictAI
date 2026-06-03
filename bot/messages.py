from typing import Any

START_TEXT = (
    "Welcome to PredictAI\n"
    "--------------------\n"
    "Your Telegram assistant for prediction markets.\n\n"
    "Use it to discover live markets, understand the odds, prepare Yes/No positions, set alerts, and track orders without leaving chat.\n\n"
    "You stay in control: PredictAI never asks for private keys, and every wallet approval happens in your wallet."
)

FIRST_RUN_TEXT = (
    "Welcome to PredictAI\n"
    "--------------------\n"
    "Prediction markets can feel noisy. PredictAI turns them into a simple chat flow.\n\n"
    "In under a minute, you can:\n"
    "1. Browse live markets\n"
    "2. Tap one market to inspect the odds\n"
    "3. Analyze or simulate a position\n"
    "4. Prepare a bet only when you are ready\n\n"
    "You do not need a wallet to explore, analyze, or simulate. Start with markets."
)

HOW_IT_WORKS_TEXT = (
    "How PredictAI works\n"
    "-------------------\n"
    "1. Browse markets by popularity, new listings, or search.\n"
    "2. Tap a market number to open a clean detail card.\n"
    "3. Use Analyze for a quick AI brief, or Simulate to preview shares and payout.\n"
    "4. When you are ready, connect a wallet and prepare a bet.\n"
    "5. You review every order before signing. Wallet approval stays in your wallet.\n\n"
    "Best first step: start with markets and inspect one opportunity."
)

HELP_TEXT = (
    "How PredictAI works\n"
    "-------------------\n"
    "Pick what you want to do next. The main flows work through buttons, and power commands are still available when you want them."
)

HELP_SECTIONS = {
    "markets": (
        "Find markets\n"
        "------------\n"
        "Browse popular markets, check new opportunities, or search by topic. Tap any market to see odds, prices, volume, and next actions.\n\n"
        "Power commands:\n"
        "/markets\n"
        "/markets [category]\n"
        "/new\n"
        "/search [keyword]\n"
        "/market [id]"
    ),
    "trading": (
        "Prepare a position\n"
        "------------------\n"
        "Open a market, tap Prepare bet, choose Yes or No, choose an amount, then review the order before signing. Signing happens in your connected wallet, not inside chat.\n\n"
        "Power command:\n"
        "/bet [market id or keyword]"
    ),
    "wallet": (
        "Wallet safety\n"
        "-------------\n"
        "Connect a Polygon wallet so PredictAI can prepare order requests. You approve every signing request yourself. PredictAI never asks for seed phrases, passwords, or private keys.\n\n"
        "Power commands:\n"
        "/connect\n"
        "/wallets\n"
        "/disconnect"
    ),
    "orders": (
        "Track orders and positions\n"
        "--------------------------\n"
        "Orders show what was signed, submitted, filled, failed, or waiting for action. Portfolio shows open positions and P&L snapshots.\n\n"
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
        "Set alerts\n"
        "----------\n"
        "Use alerts when you want to watch a market without checking it constantly. PredictAI can notify you when the Yes probability crosses your chosen threshold.\n\n"
        "Power command:\n"
        "/alerts [market id or keyword]"
    ),
    "status": (
        "System status\n"
        "-------------\n"
        "Status explains whether live submission is enabled and whether the trading configuration is ready. If something is blocked, it shows what needs attention.\n\n"
        "Power commands:\n"
        "/status\n"
        "/admin_status"
    ),
}


def format_market_list(title: str, markets: list[dict[str, Any]]) -> str:
    lines = [title, "Tap a number to inspect the market before taking action.", ""]
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
    lines.append("Tap a number to inspect a market, or use Search/Home below.")
    return "\n".join(lines).strip()


def format_market_detail(market: dict[str, Any]) -> str:
    status = "Active" if market.get("active", True) else "Inactive"
    return (
        f"{market['question']}\n"
        "--------------------\n"
        f"Status: {status}\n"
        f"Category: {market['category']}\n"
        f"Market view: {market['probability']:.0f}% Yes\n"
        f"Yes price: ${market['yes_price']:.2f}\n"
        f"No price: ${market['no_price']:.2f}\n"
        f"Volume: ${float(market.get('volume') or 0):,.0f}\n"
        f"Closes: {market.get('end_date') or 'Unknown'}\n\n"
        "Next: analyze the market, set an alert, or prepare a position."
    )
