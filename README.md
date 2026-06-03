# PredictAI

PredictAI is a Telegram bot for browsing Polymarket prediction markets, receiving AI-style market analysis, connecting wallets, and preparing non-custodial Polymarket orders.

This repository contains the production app scaffold:

- `bot/` Telegram bot handlers and message UI
- `api/` FastAPI backend
- `db/` SQLAlchemy models and CRUD helpers
- `workers/` Celery jobs for market cache refreshes
- `mini-app/` Telegram Mini App for WalletConnect and typed-data order signing

## Current phase

Phase 1 is focused on the working Telegram bot foundation:

- `/start`
- `/help`
- `/markets`
- `/markets <category>`
- `/new`
- `/search <keyword>`
- `/market <id>`
- `/analyze <id or keyword>` with Gemini fallback-ready integration
- `/portfolio` placeholder
- live Polymarket market data via `py-clob-client`, with HTTP fallback

Wallet signing, backend signature verification, pre-trade checks, and safety-gated Polymarket CLOB order submission are implemented. Live submission is controlled by `POLYMARKET_ORDER_SUBMISSION_ENABLED`.

## Local setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m bot.main
```

## Required environment variables

Use `.env.example` as the template. Do not commit `.env`.

For Render, set secrets in the Render dashboard or Blueprint environment group.

For live Polymarket orders, also set the CLOB credentials plus `POLYMARKET_USDC_SPENDER`. PredictAI checks the connected wallet's Polygon USDC balance and the Mini App prompts the user to approve USDC allowance before asking them to sign an order.

For admin controls, set `ADMIN_TELEGRAM_IDS` to your Telegram numeric user ID. Root admins can delegate access with `/admin_grant [telegram_id]` and revoke delegated access with `/admin_revoke [telegram_id]`.

## Production launch

Use `docs/LAUNCH_CHECKLIST.md` before enabling live trading. Run the smoke test with:

```bash
python scripts/smoke_test.py --api-base-url https://YOUR-API-DOMAIN --telegram --redis
```

After each deployment, follow `docs/DEPLOYMENT_VERIFICATION_RUNBOOK.md` to verify API, bot, Mini App, workers, beat, WalletConnect, order reconciliation, and rollback readiness.
