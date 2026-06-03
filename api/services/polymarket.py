from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx

from api.config import get_settings

logger = logging.getLogger(__name__)


class PolymarketServiceError(Exception):
    pass


@dataclass(frozen=True)
class Market:
    id: str
    question: str
    category: str
    probability: float
    yes_price: float
    no_price: float
    volume: float
    end_date: str | None
    active: bool
    yes_token_id: str | None = None
    no_token_id: str | None = None
    min_order_size: float = 5.0

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "question": self.question,
            "category": self.category,
            "probability": round(self.probability, 2),
            "yes_price": round(self.yes_price, 4),
            "no_price": round(self.no_price, 4),
            "volume": round(self.volume, 2),
            "end_date": self.end_date,
            "active": self.active,
            "yes_token_id": self.yes_token_id,
            "no_token_id": self.no_token_id,
            "min_order_size": self.min_order_size,
        }


class PolymarketService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: Any | None = None

    async def get_top_markets(self, limit: int = 10) -> list[dict[str, Any]]:
        markets = await self._load_markets()
        return [market.as_dict() for market in sorted(markets, key=lambda item: item.volume, reverse=True)[:limit]]

    async def get_new_markets(self, limit: int = 10) -> list[dict[str, Any]]:
        markets = await self._load_markets()
        return [market.as_dict() for market in markets[:limit]]

    async def get_markets_by_category(self, category: str, limit: int = 10) -> list[dict[str, Any]]:
        normalized = category.lower()
        markets = await self._load_markets()
        filtered = [market for market in markets if market.category.lower() == normalized]
        return [market.as_dict() for market in sorted(filtered, key=lambda item: item.volume, reverse=True)[:limit]]

    async def search_markets(self, keyword: str, limit: int = 10) -> list[dict[str, Any]]:
        needle = keyword.lower()
        markets = await self._load_markets()
        filtered = [market for market in markets if needle in market.question.lower()]
        return [market.as_dict() for market in sorted(filtered, key=lambda item: item.volume, reverse=True)[:limit]]

    async def get_market(self, market_id: str) -> dict[str, Any] | None:
        markets = await self._load_markets()
        for market in markets:
            if market.id == market_id:
                return market.as_dict()
        return None

    async def _load_markets(self) -> list[Market]:
        try:
            return await self._load_markets_with_gamma()
        except Exception as exc:
            logger.warning("Gamma market load failed, falling back to CLOB: %s", exc)
        try:
            return await asyncio.to_thread(self._load_markets_with_clob)
        except Exception as exc:
            logger.warning("py-clob-client market load failed, falling back to public HTTP: %s", exc)
            return await self._load_markets_with_http()

    def _load_markets_with_clob(self) -> list[Market]:
        from py_clob_client.client import ClobClient

        if self._client is None:
            self._client = ClobClient(
                host=self.settings.polymarket_host,
                key=self.settings.polymarket_private_key or None,
                chain_id=self.settings.polygon_chain_id,
            )
        raw = self._client.get_markets()
        return self._normalize_markets(raw)

    async def _load_markets_with_http(self) -> list[Market]:
        url = f"{self.settings.polymarket_host.rstrip('/')}/markets"
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(url)
            response.raise_for_status()
            return self._normalize_markets(response.json())

    async def _load_markets_with_gamma(self) -> list[Market]:
        url = "https://gamma-api.polymarket.com/markets"
        params = {
            "active": "true",
            "closed": "false",
            "archived": "false",
            "limit": 200,
            "order": "volume24hr",
            "ascending": "false",
        }
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return self._normalize_markets(response.json())

    def _normalize_markets(self, raw: Any) -> list[Market]:
        if isinstance(raw, dict):
            candidates = raw.get("data") or raw.get("markets") or []
        else:
            candidates = raw or []

        markets: list[Market] = []
        for item in candidates:
            try:
                market = self._normalize_market(item)
            except (TypeError, ValueError, KeyError):
                continue
            if market.active and market.question:
                markets.append(market)

        if not markets:
            raise PolymarketServiceError("No active Polymarket markets returned")
        return markets

    def _normalize_market(self, item: dict[str, Any]) -> Market:
        tokens = self._extract_tokens(item)
        yes_price = self._extract_price(tokens, "yes")
        no_price = self._extract_price(tokens, "no")
        yes_token_id = self._extract_token_id(tokens, "yes")
        no_token_id = self._extract_token_id(tokens, "no")
        if yes_price <= 0 and no_price > 0:
            yes_price = 1 - no_price
        if no_price <= 0 and yes_price > 0:
            no_price = 1 - yes_price

        volume = float(item.get("volume") or item.get("volumeNum") or item.get("liquidity") or item.get("liquidityNum") or 0)
        market_id = str(item.get("condition_id") or item.get("conditionId") or item.get("id") or item.get("market_slug") or item.get("slug"))
        category = self._extract_category(item)
        end_date = item.get("end_date_iso") or item.get("endDate") or item.get("end_date") or item.get("endDateIso")
        question = str(item.get("question") or item.get("title") or "")
        min_order_size = float(item.get("minimum_order_size") or item.get("orderMinSize") or item.get("min_order_size") or 5)
        active = self._is_tradeable_market(item, question, end_date, yes_price, no_price, yes_token_id, no_token_id)

        return Market(
            id=market_id,
            question=question,
            category=category.lower(),
            probability=yes_price * 100,
            yes_price=yes_price,
            no_price=no_price,
            volume=volume,
            end_date=end_date,
            active=active,
            yes_token_id=yes_token_id,
            no_token_id=no_token_id,
            min_order_size=min_order_size,
        )

    def _extract_price(self, tokens: Any, outcome: str) -> float:
        if not isinstance(tokens, list):
            return 0
        for token in tokens:
            token_outcome = str(token.get("outcome") or token.get("name") or "").lower()
            if token_outcome == outcome:
                return float(token.get("price") or token.get("last_price") or token.get("lastPrice") or 0)
        return 0

    def _extract_token_id(self, tokens: Any, outcome: str) -> str | None:
        if not isinstance(tokens, list):
            return None
        for token in tokens:
            token_outcome = str(token.get("outcome") or token.get("name") or "").lower()
            if token_outcome == outcome:
                token_id = token.get("token_id") or token.get("tokenId") or token.get("id")
                return str(token_id) if token_id else None
        return None

    def _extract_tokens(self, item: dict[str, Any]) -> list[dict[str, Any]]:
        tokens = item.get("tokens")
        if isinstance(tokens, list):
            return tokens

        outcomes = self._parse_json_list(item.get("outcomes"))
        prices = self._parse_json_list(item.get("outcomePrices"))
        token_ids = self._parse_json_list(item.get("clobTokenIds"))
        if outcomes and prices and token_ids:
            return [
                {
                    "outcome": outcome,
                    "price": prices[index] if index < len(prices) else 0,
                    "token_id": token_ids[index] if index < len(token_ids) else None,
                }
                for index, outcome in enumerate(outcomes)
            ]
        return item.get("outcomes") if isinstance(item.get("outcomes"), list) else []

    def _parse_json_list(self, value: Any) -> list[Any]:
        if isinstance(value, list):
            return value
        if not value:
            return []
        try:
            parsed = json.loads(str(value))
        except (TypeError, ValueError):
            return []
        return parsed if isinstance(parsed, list) else []

    def _extract_category(self, item: dict[str, Any]) -> str:
        category = item.get("category")
        if category:
            return str(category).lower()
        tags = item.get("tags") or []
        if isinstance(tags, list) and tags:
            first_tag = tags[0]
            if isinstance(first_tag, dict):
                return str(first_tag.get("label") or first_tag.get("slug") or "general").lower()
            return str(first_tag or "general").lower()
        return "general"

    def _is_expired(self, end_date: Any) -> bool:
        if not end_date:
            return False
        try:
            parsed = datetime.fromisoformat(str(end_date).replace("Z", "+00:00"))
        except ValueError:
            return False
        return parsed < datetime.now(timezone.utc)

    def _is_tradeable_market(
        self,
        item: dict[str, Any],
        question: str,
        end_date: Any,
        yes_price: float,
        no_price: float,
        yes_token_id: str | None,
        no_token_id: str | None,
    ) -> bool:
        if not bool(item.get("active", True)):
            return False
        if self._truthy(item.get("closed")) or self._truthy(item.get("archived")):
            return False
        if item.get("accepting_orders") is False or item.get("acceptingOrders") is False:
            return False
        if item.get("enable_order_book") is False or item.get("enableOrderBook") is False:
            return False
        if self._is_expired(end_date) or self._question_has_past_date(question):
            return False
        if not yes_token_id or not no_token_id:
            return False
        return 0 < yes_price < 1 and 0 < no_price < 1

    def _question_has_past_date(self, question: str) -> bool:
        match = re.search(r"\((\d{4}-\d{2}-\d{2})\)", question)
        if not match:
            return False
        try:
            parsed = datetime.fromisoformat(match.group(1)).replace(tzinfo=timezone.utc)
        except ValueError:
            return False
        return parsed.date() < datetime.now(timezone.utc).date()

    def _truthy(self, value: Any) -> bool:
        if isinstance(value, str):
            return value.lower() in {"1", "true", "yes"}
        return bool(value)
