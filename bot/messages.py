from typing import Any

START_TEXT = (
    "PredictAI\n"
    "---------\n"
    "Prediction markets. Inside Telegram.\n\n"
    "Browse live markets on Polymarket, get AI analysis in seconds, and place real bets — all without leaving this chat.\n\n"
    "Your wallet stays yours. PredictAI builds the transaction, you sign it. No private keys, no custody, no surprises."
)

FIRST_RUN_TEXT = (
    "PredictAI\n"
    "---------\n"
    "The market has an opinion on everything. Now you can trade it from Telegram.\n\n"
    "Here's how to start:\n"
    "1. Browse live markets — filter by category or see what's new\n"
    "2. Tap any market to see the odds, volume, and closing date\n"
    "3. Run /analyze for an AI read on any position\n"
    "4. Connect your wallet when you're ready to bet\n\n"
    "No wallet needed to explore. Start with /markets."
)

HOW_IT_WORKS_TEXT = (
    "How it works\n"
    "------------\n"
    "1. Browse markets by volume, category, or recency.\n"
    "2. Tap a number to open the market detail — odds, price, volume, close date.\n"
    "3. Run /analyze for a full AI breakdown, or /quick for just the hot take.\n"
    "4. When you're ready, /connect your wallet and /bet.\n"
    "5. Review the order, confirm, then sign in your wallet. That's it.\n\n"
    "Your wallet is never touched without your approval."
)

HELP_TEXT = (
    "What do you want to do?\n"
    "-----------------------\n"
    "Use the buttons below or type a command directly. Everything works either way."
)

HELP_SECTIONS = {
    "markets": (
        "Browse markets\n"
        "--------------\n"
        "See what the crowd is pricing in. Filter by topic, sort by volume, or catch what just opened.\n\n"
        "Commands:\n"
        "/markets — top active markets\n"
        "/markets [category] — filter by topic (crypto, politics, sports...)\n"
        "/new — markets added in the last 24h\n"
        "/search [keyword] — find a specific market\n"
        "/market [id] — open a market by ID"
    ),
    "trading": (
        "Place a bet\n"
        "-----------\n"
        "Pick a market, choose Yes or No, set your amount. The bot shows you the full order before anything is signed — and signing always happens in your own wallet, never here.\n\n"
        "Command:\n"
        "/bet [market id or keyword]"
    ),
    "wallet": (
        "Your wallet\n"
        "-----------\n"
        "Connect a Polygon wallet (MetaMask, Rabby, or any WalletConnect-compatible wallet) to place bets. PredictAI prepares orders — you approve them. We never ask for seed phrases, passwords, or private keys. Ever.\n\n"
        "Commands:\n"
        "/connect — link your wallet\n"
        "/wallets — view connected wallets\n"
        "/disconnect — remove a wallet"
    ),
    "orders": (
        "Orders & portfolio\n"
        "------------------\n"
        "Track every position from open to close. See what filled, what's pending, and where your P&L stands.\n\n"
        "Commands:\n"
        "/orders — full order history\n"
        "/sync_orders — pull latest status from chain\n"
        "/retry_order [id] — retry a failed order\n"
        "/cancel_order [id] — cancel a pending order\n"
        "/portfolio — open positions\n"
        "/history — closed positions\n"
        "/pnl — your profit and loss"
    ),
    "alerts": (
        "Alerts\n"
        "------\n"
        "Set a probability threshold on any market. When Yes crosses it, you get notified. Stop refreshing — let the market come to you.\n\n"
        "Command:\n"
        "/alerts [market id or keyword]"
    ),
    "status": (
        "System status\n"
        "-------------\n"
        "Check whether live trading is enabled and the connection to Polymarket is healthy. If something's off, this is where it shows.\n\n"
        "Commands:\n"
        "/status\n"
        "/admin_status"
    ),
}


def format_market_list(title: str, markets: list[dict[str, Any]]) -> str:
    lines = [title, "Tap a number to open a market.", ""]
    for index, market in enumerate(markets[:10], start=1):
        closes = market.get("end_date") or "close unknown"
        lines.extend(
            [
                f"{index}. {market['question']}",
                (
                    f"Yes {market['probability']:.0f}% | "
                    f"${float(market.get('volume') or 0):,.0f} vol | "
                    f"closes {closes}"
                ),
                "",
            ]
        )
    lines.append("Tap a number for details, or search for something specific.")
    return "\n".join(lines).strip()


def format_market_detail(market: dict[str, Any]) -> str:
    status = "Live" if market.get("active", True) else "Closed"
    return (
        f"{market['question']}\n"
        "--------------------\n"
        f"Status: {status}\n"
        f"Category: {market['category']}\n"
        f"Crowd says: {market['probability']:.0f}% Yes\n"
        f"Yes: ${market['yes_price']:.2f}  ·  No: ${market['no_price']:.2f}\n"
        f"Volume: ${float(market.get('volume') or 0):,.0f}\n"
        f"Closes: {market.get('end_date') or 'TBD'}\n\n"
        "Analyze it, set an alert, or place your bet."
    )
