from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from typing import Any

import google.generativeai as genai

from api.config import get_settings

logger = logging.getLogger(__name__)


def gemini_runtime_status() -> dict[str, Any]:
    settings = get_settings()
    raw_env = (os.getenv("GEMINI_API_KEY") or "").strip()
    configured_key = (settings.gemini_api_key or "").strip()
    key_value = configured_key or raw_env
    key_hash = hashlib.sha256(key_value.encode("utf-8")).hexdigest()[:8] if key_value else ""
    return {
        "configured": bool(key_value),
        "settings_has_key": bool(configured_key),
        "env_has_key": bool(raw_env),
        "key_length": len(key_value),
        "key_hash": key_hash,
        "model": settings.gemini_model,
        "fallback_models": _split_models(settings.gemini_fallback_models),
        "render_service": os.getenv("RENDER_SERVICE_NAME") or os.getenv("RENDER_SERVICE_ID") or "unknown",
    }


def _split_models(value: str) -> list[str]:
    return [model.strip() for model in (value or "").split(",") if model.strip()]


def _is_not_found_error(exc: Exception) -> bool:
    text = f"{type(exc).__name__} {exc}".lower()
    return "notfound" in text or "not_found" in text or "not found" in text or "404" in text


class AIAnalysisService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.model_name = self.settings.gemini_model
        self.model_chain = [self.model_name, *_split_models(self.settings.gemini_fallback_models)]
        self.api_key = (self.settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "") or "").strip()
        if self.api_key:
            genai.configure(api_key=self.api_key)

    async def analyze_market(self, market: dict[str, Any]) -> dict[str, Any]:
        if not self.api_key:
            return self._fallback(market, reason="missing_config")

        last_error_type = None
        attempted_models: list[str] = []
        unique_models = list(dict.fromkeys(self.model_chain))
        for model_name in unique_models:
            attempted_models.append(model_name)
            model = genai.GenerativeModel(
                model_name,
                generation_config={
                    "temperature": 0.25,
                    "max_output_tokens": 700,
                    "response_mime_type": "application/json",
                },
            )
            try:
                response = await model.generate_content_async(self._prompt(market))
            except Exception as exc:
                last_error_type = type(exc).__name__
                logger.exception("Gemini market analysis failed for model %s", model_name)
                if _is_not_found_error(exc) and model_name != unique_models[-1]:
                    continue
                return self._fallback(
                    market,
                    reason="request_failed",
                    error_type=last_error_type,
                    attempted_models=attempted_models,
                )
            report = self._coerce_report(market, self._parse_json(response.text))
            report["model"] = model_name
            report["attempted_models"] = attempted_models
            return report
        return self._fallback(
            market,
            reason="request_failed",
            error_type=last_error_type,
            attempted_models=attempted_models,
        )

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

    def _fallback(
        self,
        market: dict[str, Any],
        reason: str = "market_data_only",
        error_type: str | None = None,
        attempted_models: list[str] | None = None,
    ) -> dict[str, Any]:
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
        if reason == "missing_config":
            summary = "Gemini is not configured in the running analysis service, so this is a market-data-only read."
            reasons = [
                f"The current market price implies roughly {probability:.0f}% Yes.",
                "No external news or rules context was used in this fallback analysis.",
            ]
            action = "Use this as a baseline only; wait for a stronger edge or run analysis after Gemini is configured."
        elif reason == "request_failed":
            summary = "Gemini is configured, but the analysis request failed before a usable response was returned."
            attempted = ", ".join(attempted_models or self.model_chain)
            reasons = [
                f"The current market price implies roughly {probability:.0f}% Yes.",
                f"Gemini returned {error_type or 'an error'} after trying: {attempted}.",
            ]
            action = "Use this as a baseline only; retry after checking the Gemini key, model access, and Render logs."
        else:
            summary = "PredictAI used a market-data-only read for this report."
            reasons = [
                f"The current market price implies roughly {probability:.0f}% Yes.",
                "No external news or rules context was used in this fallback analysis.",
            ]
            action = "Use this as a baseline only; wait for a stronger edge before trading."

        return {
            "market_id": market.get("id"),
            "question": market.get("question"),
            "market_probability_yes": probability,
            "ai_probability_yes": ai_probability,
            "edge_percent": 0,
            "signal": signal,
            "confidence": confidence,
            "summary": summary,
            "reasons": reasons,
            "risks": [
                "Thin liquidity, stale prices, or unclear resolution rules can make the displayed probability unreliable.",
            ],
            "suggested_action": action,
            "model": "fallback",
            "fallback_reason": reason,
            "fallback_error_type": error_type,
            "attempted_models": attempted_models or self.model_chain,
        }
