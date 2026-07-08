from __future__ import annotations

import time
from typing import Any

import httpx

TRACKED_COINS = [
    {"id": "bitcoin", "symbol": "BTC", "name": "Bitcoin"},
    {"id": "ethereum", "symbol": "ETH", "name": "Ethereum"},
    {"id": "solana", "symbol": "SOL", "name": "Solana"},
    {"id": "matic-network", "symbol": "MATIC", "name": "Polygon"},
    {"id": "ripple", "symbol": "XRP", "name": "XRP"},
]
CACHE_TTL_SECONDS = 30

_cache: dict[str, Any] = {"data": None, "fetched_at": 0.0}


async def get_live_prices() -> list[dict[str, Any]]:
    now = time.monotonic()
    if _cache["data"] is not None and now - _cache["fetched_at"] < CACHE_TTL_SECONDS:
        return _cache["data"]

    ids = ",".join(coin["id"] for coin in TRACKED_COINS)
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {"ids": ids, "vs_currencies": "usd", "include_24hr_change": "true"}
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        raw = response.json()

    prices = []
    for coin in TRACKED_COINS:
        entry = raw.get(coin["id"]) or {}
        if "usd" not in entry:
            continue
        prices.append(
            {
                "symbol": coin["symbol"],
                "name": coin["name"],
                "price_usd": entry.get("usd"),
                "change_24h_pct": entry.get("usd_24h_change"),
            }
        )

    _cache["data"] = prices
    _cache["fetched_at"] = now
    return prices
