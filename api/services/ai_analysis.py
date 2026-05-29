from __future__ import annotations

from typing import Any

import google.generativeai as genai

from api.config import get_settings


class AIAnalysisService:
    def __init__(self) -> None:
        self.settings = get_settings()
        if self.settings.gemini_api_key:
            genai.configure(api_key=self.settings.gemini_api_key)

    async def analyze_market(self, market: dict[str, Any]) -> dict[str, Any]:
        if not self.settings.gemini_api_key:
            return self._fallback(market)

        prompt = (
            "Write a concise prediction market analysis for a Telegram bot. "
            "Return plain text with probability view, confidence, key drivers, and risk. "
            f"Market: {market}"
        )
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = await model.generate_content_async(prompt)
        return {
            "market_id": market["id"],
            "question": market["question"],
            "probability": market["probability"],
            "analysis": response.text,
        }

    def _fallback(self, market: dict[str, Any]) -> dict[str, Any]:
        probability = float(market.get("probability", 0))
        confidence = "Medium" if 35 <= probability <= 75 else "Low"
        tone = "Bullish" if probability >= 55 else "Cautious"
        return {
            "market_id": market.get("id"),
            "question": market.get("question"),
            "probability": probability,
            "confidence": confidence,
            "tone": tone,
            "analysis": (
                f"{tone} setup at {probability:.0f}% with {confidence.lower()} confidence. "
                "Watch volume, fresh news catalysts, and late liquidity before entering."
            ),
        }
