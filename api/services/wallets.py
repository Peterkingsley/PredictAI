from __future__ import annotations

import re

import httpx

from api.config import get_settings

POLYGON_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"


def is_evm_address(address: str) -> bool:
    return bool(re.fullmatch(r"0x[a-fA-F0-9]{40}", address or ""))


def short_address(address: str) -> str:
    return f"{address[:6]}...{address[-4:]}"


async def get_usdc_balance(address: str) -> float | None:
    settings = get_settings()
    if not settings.polygon_rpc_url or not is_evm_address(address):
        return None

    selector = "70a08231"
    padded_address = address.lower().removeprefix("0x").rjust(64, "0")
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_call",
        "params": [
            {
                "to": POLYGON_USDC,
                "data": f"0x{selector}{padded_address}",
            },
            "latest",
        ],
    }
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(settings.polygon_rpc_url, json=payload)
        response.raise_for_status()
        result = response.json().get("result")
    if not result:
        return None
    return int(result, 16) / 1_000_000
