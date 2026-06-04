from __future__ import annotations

import json
import re
from typing import Any

import google.generativeai as genai

from api.config import get_settings


class AIAnalysisService:
    model_name = "gemini-1.5-flash"

    def __init__(self) -> None:
        self.settings = get_settings()
        if self.settings.gemini_api_key:
            genai.configure(api_key=self.settings.gemini_api_key)

    async def analyze_market(self, market: dict[str, Any]) -> dict[str, Any]:
        if not self.settings.gemini_api_key:
            return self._fallback(market)

        model = genai.GenerativeModel(
            self.model_name,
            generation_config={
                "temperature": 0.25,
                "max_output_tokens": 700,
                "response_mime_type": "application/json",
            },
        )
        try:
            response = await model.generate_content_async(self._prompt(market))
        except Exception:
            return self._fallback(market)
        return self._coerce_report(market, self._parse_json(response.text))

    def _prompt(self, market: dict[str, Any]) -> str:
        packet = self._market_packet(market)
        return (
            "You are PredictAI's concise prediction-market analyst. "
            "Analyze the market as a probability and pricing problem, not as financial advice. "
            "Use only the supplied data. If data is missing, state uncertainty. "
            "Return strict JSON only with these keys: "
            "ai_probability_yes, market_probability_yes, edge_percent, signal, confidence, "
            "summary, reasons, risks, suggested_action. "
            "Rules: ai_probability_yes must be 1-99; signal must be one of LEAN_YES, LEAN_NO, NO_EDGE, AVOID; "
            "confidence must be LOW, MEDIUM, or HIGH; reasons must contain 2-3 short strings; risks must contain 1-3 short strings; "
            "suggested_action must be one short sentence with a price discipline. "
            f"Market packet: {json.dumps(packet, separators=(',', ':'))}"
        )

    def _market_packet(self, market: dict[str, Any]) -> dict[str, Any]:
        probability = float(market.get("probability") or 0)
        return {
            "id": market.get("id"),
            "question": market.get("question"),
            "category": market.get("category"),
            "active": market.get("active", True),
            "yes_price": float(market.get("yes_price") or probability / 100 or 0),
            "no_price": float(market.get("no_price") or (100 - probability) / 100 or 0),
            "market_probability_yes": probability,
            "volume": float(market.get("volume") or 0),
            "liquidity": float(market.get("liquidity") or 0),
            "close_date": market.get("end_date"),
            "min_order_size": float(market.get("min_order_size") or 0),
        }

    def _parse_json(self, raw: str) -> dict[str, Any]:
        text = (raw or "").strip()
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    def _coerce_report(self, market: dict[str, Any], parsed: dict[str, Any]) -> dict[str, Any]:
        fallback = self._fallback(market)
        market_probability = float(market.get("probability") or 0)
        ai_probability = self._bounded_probability(parsed.get("ai_probability_yes"), fallback["ai_probability_yes"])
        signal = str(parsed.get("signal") or fallback["signal"]).upper()
        if signal not in {"LEAN_YES", "LEAN_NO", "NO_EDGE", "AVOID"}:
            signal = fallback["signal"]
        confidence = str(parsed.get("confidence") or fallback["confidence"]).upper()
        if confidence not in {"LOW", "MEDIUM", "HIGH"}:
            confidence = fallback["confidence"]
        reasons = self._short_list(parsed.get("reasons"), fallback["reasons"], limit=3)
        risks = self._short_list(parsed.get("risks"), fallback["risks"], limit=3)
        return {
            "market_id": market.get("id"),
            "question": market.get("question"),
            "market_probability_yes": market_probability,
            "ai_probability_yes": ai_probability,
            "edge_percent": round(ai_probability - market_probability, 1),
            "signal": signal,
            "confidence": confidence,
            "summary": str(parsed.get("summary") or fallback["summary"])[:260],
            "reasons": reasons,
            "risks": risks,
            "suggested_action": str(parsed.get("suggested_action") or fallback["suggested_action"])[:220],
            "model": self.model_name,
        }

    def _bounded_probability(self, value: Any, fallback: float) -> float:
        try:
            probability = float(value)
        except (TypeError, ValueError):
            probability = float(fallback)
        return min(max(round(probability, 1), 1), 99)

    def _short_list(self, value: Any, fallback: list[str], limit: int) -> list[str]:
        items = value if isinstance(value, list) else fallback
        clean = [str(item).strip()[:160] for item in items if str(item).strip()]
        return (clean or fallback)[:limit]

    def _fallback(self, market: dict[str, Any]) -> dict[str, Any]:
        probability = float(market.get("probability", 0))
        ai_probability = probability
        if market.get("active") is False:
            signal = "AVOID"
            confidence = "LOW"
        elif probability >= 58:
            signal = "LEAN_YES"
            confidence = "MEDIUM" if probability <= 75 else "LOW"
        elif probability <= 42:
            signal = "LEAN_NO"
            confidence = "MEDIUM" if probability >= 25 else "LOW"
        else:
            signal = "NO_EDGE"
            confidence = "LOW"
        return {
            "market_id": market.get("id"),
            "question": market.get("question"),
            "market_probability_yes": probability,
            "ai_probability_yes": ai_probability,
            "edge_percent": 0,
            "signal": signal,
            "confidence": confidence,
            "summary": "Gemini is not configured in the running analysis service, so this is a market-data-only read.",
            "reasons": [
                f"The current market price implies roughly {probability:.0f}% Yes.",
                "No external news or rules context was used in this fallback analysis.",
            ],
            "risks": [
                "Thin liquidity, stale prices, or unclear resolution rules can make the displayed probability unreliable.",
            ],
            "suggested_action": "Use this as a baseline only; wait for a stronger edge or run analysis after Gemini is configured.",
            "model": "fallback",
        }
