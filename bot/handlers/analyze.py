from telegram import Update
from telegram.ext import ContextTypes

from api.services.ai_analysis import AIAnalysisService
from api.services.polymarket import PolymarketService
from bot.keyboards import analysis_result_keyboard, recovery_keyboard
from db.crud import get_cached_market_analysis, upsert_market_analysis_cache
from db.models import SessionLocal

market_service = PolymarketService()


async def analyze_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    target = " ".join(context.args) if context.args else ""
    if not target:
        await update.effective_message.reply_text(
            "Get a market brief\n"
            "------------------\n"
            "Open a market and tap Analyze, or type /analyze followed by a topic. PredictAI will summarize the market view and key considerations.",
            reply_markup=recovery_keyboard(),
        )
        return

    market = context.user_data.get("selected_market") if target == "selected" else await market_service.get_market(target)
    if not market:
        results = await market_service.search_markets(target, limit=1)
        market = results[0] if results else None

    if not market:
        await update.effective_message.reply_text(
            f'No market found for "{target}".',
            reply_markup=recovery_keyboard(),
        )
        return

    context.user_data["selected_market"] = market
    report, cached = await _get_or_create_report(market)
    text = _format_report(report, cached=cached)

    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=analysis_result_keyboard())
    else:
        await update.effective_message.reply_text(text, reply_markup=analysis_result_keyboard())


async def quick_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await analyze_command(update, context)


async def _get_or_create_report(market: dict) -> tuple[dict, bool]:
    async with SessionLocal() as session:
        cached = await get_cached_market_analysis(session, str(market.get("id")), float(market.get("probability") or 0))
        if cached:
            cached_report = dict(cached.analysis or {})
            if cached_report.get("model") != "fallback" and cached_report.get("analysis_version") == 2:
                return cached_report, True
    report = await AIAnalysisService().analyze_market(market)
    if report.get("model") != "fallback":
        async with SessionLocal() as session:
            await upsert_market_analysis_cache(session, market, report, report.get("model", "unknown"))
    return report, False


def _format_report(report: dict, cached: bool = False) -> str:
    signal = _signal_label(report.get("signal"))
    verdict = _verdict_label(report.get("signal"))
    confidence = str(report.get("confidence") or "LOW").title()
    market_probability = float(report.get("market_probability_yes") or 0)
    ai_probability = float(report.get("ai_probability_yes") or market_probability)
    edge = float(report.get("edge_percent") or ai_probability - market_probability)
    reasons = _bullets(report.get("reasons") or [])
    risks = _bullets(report.get("risks") or [])
    alert_suggestion = _alert_suggestion(report, market_probability, edge)
    cache_text = "Cached analysis." if cached else "Fresh analysis."
    return (
        "AI market view\n"
        "--------------\n"
        f"{report.get('question')}\n\n"
        f"Verdict: {verdict}\n"
        f"Market Yes: {market_probability:.0f}%\n"
        f"AI Yes estimate: {ai_probability:.0f}%\n"
        f"Edge: {edge:+.0f}% Yes\n"
        f"Signal: {signal}\n"
        f"Confidence: {confidence}\n\n"
        f"{report.get('summary')}\n\n"
        "Why this matters\n"
        f"{reasons}\n\n"
        "Risks\n"
        f"{risks}\n\n"
        "Alert idea\n"
        f"{alert_suggestion}\n\n"
        "Action\n"
        f"{report.get('suggested_action')}\n\n"
        f"{cache_text} Not financial advice."
    )


def _bullets(items: list) -> str:
    clean = [str(item).strip() for item in items if str(item).strip()]
    if not clean:
        return "- Not enough data."
    return "\n".join(f"- {item}" for item in clean[:3])


def _signal_label(signal: str | None) -> str:
    labels = {
        "LEAN_YES": "Lean Yes",
        "LEAN_NO": "Lean No",
        "NO_EDGE": "No clear edge",
        "AVOID": "Avoid",
    }
    return labels.get(str(signal or "").upper(), "No clear edge")


def _verdict_label(signal: str | None) -> str:
    labels = {
        "LEAN_YES": "Possible Yes edge",
        "LEAN_NO": "Possible No edge",
        "NO_EDGE": "Watch",
        "AVOID": "Avoid",
    }
    return labels.get(str(signal or "").upper(), "Watch")


def _alert_suggestion(report: dict, market_probability: float, edge: float) -> str:
    signal = str(report.get("signal") or "").upper()
    if signal == "LEAN_YES":
        target = max(1, min(99, round(market_probability - 3)))
        return f"Set an alert if Yes falls to {target}% or volume increases before entry."
    if signal == "LEAN_NO":
        target = max(1, min(99, round(market_probability + 3)))
        return f"Set an alert if Yes rises to {target}% or liquidity improves."
    if abs(edge) < 3:
        return "Set an alert for a 3-5% price move before considering a trade."
    return "Set an alert for a major price or volume change before acting."
