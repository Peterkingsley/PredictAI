from __future__ import annotations

import argparse
import asyncio
import importlib
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin

import httpx
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


BASE_ENV = [
    "TELEGRAM_BOT_TOKEN",
    "DATABASE_URL",
    "REDIS_URL",
    "MINI_APP_URL",
    "WALLETCONNECT_PROJECT_ID",
    "ADMIN_TELEGRAM_IDS",
]
LIVE_ENV = [
    "POLYMARKET_PRIVATE_KEY",
    "POLYMARKET_API_KEY",
    "POLYMARKET_API_SECRET",
    "POLYMARKET_API_PASSPHRASE",
    "POLYMARKET_USDC_SPENDER",
    "POLYGON_RPC_URL",
]
IMPORT_TARGETS = [
    "api.main",
    "bot.main",
    "workers.celery_app",
    "workers.tasks",
    "api.services.order_submission",
]


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str
    required: bool = True


def add_result(results: list[CheckResult], name: str, ok: bool, detail: str, required: bool = True) -> None:
    results.append(CheckResult(name=name, ok=ok, detail=detail, required=required))


def env_enabled(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def mask(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}...{value[-4:]}"


def check_env(results: list[CheckResult]) -> None:
    for key in BASE_ENV:
        value = os.getenv(key, "")
        add_result(results, f"env:{key}", bool(value), "set" if value else "missing")

    live_enabled = env_enabled(os.getenv("POLYMARKET_ORDER_SUBMISSION_ENABLED"))
    add_result(
        results,
        "env:POLYMARKET_ORDER_SUBMISSION_ENABLED",
        True,
        "true" if live_enabled else "false",
        required=False,
    )
    if live_enabled:
        for key in LIVE_ENV:
            value = os.getenv(key, "")
            add_result(results, f"env:{key}", bool(value), "set" if value else "missing for live trading")

    admin_ids = [item.strip() for item in os.getenv("ADMIN_TELEGRAM_IDS", "").split(",") if item.strip()]
    invalid_admin_ids = [item for item in admin_ids if not item.isdigit()]
    add_result(
        results,
        "env:ADMIN_TELEGRAM_IDS format",
        not invalid_admin_ids and bool(admin_ids),
        f"{len(admin_ids)} root admin(s)" if not invalid_admin_ids else f"invalid IDs: {', '.join(invalid_admin_ids)}",
    )


def check_imports(results: list[CheckResult]) -> None:
    for module_name in IMPORT_TARGETS:
        try:
            importlib.import_module(module_name)
            add_result(results, f"import:{module_name}", True, "ok")
        except Exception as exc:
            add_result(results, f"import:{module_name}", False, f"{type(exc).__name__}: {exc}")


async def check_api(results: list[CheckResult], api_base_url: str | None) -> None:
    if not api_base_url:
        add_result(results, "api:base_url", True, "skipped; pass --api-base-url or set SMOKE_API_BASE_URL", required=False)
        return

    base_url = api_base_url.rstrip("/") + "/"
    async with httpx.AsyncClient(timeout=15) as client:
        await check_json_endpoint(results, client, base_url, "api:/health", "health")
        await check_json_endpoint(results, client, base_url, "api:/trades/readiness", "trades/readiness")
        await check_json_endpoint(results, client, base_url, "api:/markets/top", "markets/top?limit=1", required=False)


async def check_json_endpoint(
    results: list[CheckResult],
    client: httpx.AsyncClient,
    base_url: str,
    name: str,
    path: str,
    required: bool = True,
) -> None:
    try:
        response = await client.get(urljoin(base_url, path))
        response.raise_for_status()
        data = response.json()
        detail = data.get("status", "ok") if isinstance(data, dict) else f"{len(data)} item(s)"
        add_result(results, name, True, str(detail), required=required)
    except Exception as exc:
        add_result(results, name, False, f"{type(exc).__name__}: {exc}", required=required)


async def check_telegram(results: list[CheckResult], enabled: bool) -> None:
    if not enabled:
        add_result(results, "telegram:getMe", True, "skipped; pass --telegram", required=False)
        return
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        add_result(results, "telegram:getMe", False, "TELEGRAM_BOT_TOKEN missing")
        return
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            response.raise_for_status()
            data = response.json()
        username = (data.get("result") or {}).get("username") if data.get("ok") else None
        add_result(results, "telegram:getMe", bool(username), f"@{username}" if username else str(data))
    except Exception as exc:
        add_result(results, "telegram:getMe", False, f"{type(exc).__name__}: {exc}")


def check_redis(results: list[CheckResult], enabled: bool) -> None:
    if not enabled:
        add_result(results, "redis:ping", True, "skipped; pass --redis", required=False)
        return
    redis_url = os.getenv("REDIS_URL", "")
    if not redis_url:
        add_result(results, "redis:ping", False, "REDIS_URL missing")
        return
    try:
        from redis import Redis

        client = Redis.from_url(redis_url, socket_connect_timeout=5, socket_timeout=5)
        add_result(results, "redis:ping", bool(client.ping()), f"connected to {mask(redis_url)}")
    except Exception as exc:
        add_result(results, "redis:ping", False, f"{type(exc).__name__}: {exc}")


def print_results(results: list[CheckResult]) -> int:
    failures = [result for result in results if not result.ok and result.required]
    warnings = [result for result in results if not result.ok and not result.required]
    for result in results:
        symbol = "PASS" if result.ok else "WARN" if not result.required else "FAIL"
        print(f"[{symbol}] {result.name} - {result.detail}")
    print()
    print(f"Summary: {len(results) - len(failures) - len(warnings)} passed, {len(warnings)} warning(s), {len(failures)} failure(s)")
    return 1 if failures else 0


async def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(description="PredictAI production smoke test")
    parser.add_argument("--api-base-url", default=os.getenv("SMOKE_API_BASE_URL", ""), help="Deployed API base URL")
    parser.add_argument("--telegram", action="store_true", help="Call Telegram getMe using TELEGRAM_BOT_TOKEN")
    parser.add_argument("--redis", action="store_true", help="Ping Redis using REDIS_URL")
    args = parser.parse_args()

    results: list[CheckResult] = []
    check_env(results)
    check_imports(results)
    await check_api(results, args.api_base_url)
    await check_telegram(results, args.telegram)
    check_redis(results, args.redis)
    return print_results(results)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
