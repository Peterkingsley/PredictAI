# PredictAI

PredictAI is a Telegram bot **and** a standalone public website for browsing Polymarket prediction markets, receiving AI-style market analysis, connecting wallets, and preparing non-custodial Polymarket orders.

This repository contains the production app scaffold:

- `bot/` Telegram bot handlers and message UI
- `api/` FastAPI backend (serves both the bot and the public website)
- `db/` SQLAlchemy models and CRUD helpers
- `workers/` Celery jobs for market cache refreshes
- `mini-app/` Telegram Mini App for WalletConnect and typed-data order signing
- `web/` Public website (React/Vite) with email/password accounts, market browsing, wallet-based trading, live prices, a Creator (market suggestion) tool, and a points/referral Rewards center

## Public website (`web/`)

The website is a separate frontend from the Telegram Mini App and talks to the same FastAPI backend:

- **Markets/Events** &mdash; browse, search, and filter live Polymarket markets; open a market to trade YES/NO from the browser
- **Accounts** &mdash; email/password sign up and sign in (JWT-based), independent of Telegram
- **Wallet trading** &mdash; connect a Polygon wallet (Reown WalletConnect), approve USDC, sign a typed-data order intent, and submit it through the same Polymarket order pipeline the bot uses
- **Prices** &mdash; a live ticker for a handful of major assets
- **Creator** &mdash; submit a market suggestion (question + resolution criteria); admins review and approve/reject it. Suggestions are not yet real Polymarket markets in v1
- **Rewards** &mdash; a points ledger (trades, suggestions, referrals) plus a personal referral link

### Local setup

```bash
cd web
npm install
cp ../.env.example .env   # then set VITE_API_BASE_URL, VITE_WALLETCONNECT_PROJECT_ID, VITE_APP_URL
npm run dev
```

The API needs `JWT_SECRET` set (any random string) for the website's auth endpoints (`/auth/*`, `/web-wallet/*`, `/web-trades/*`, `/creator/*`, `/rewards/*`) to work, and `WEB_APP_URL`/`CORS_ORIGINS` to include the website's origin.

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

Website Creator suggestions are reviewed by web accounts with `users.is_admin = true`. There is no self-serve promotion flow yet in v1 &mdash; set it directly in the database (`UPDATE users SET is_admin = true WHERE email = '...'`) for the accounts that should review suggestions.

## Production launch

Use `docs/LAUNCH_CHECKLIST.md` before enabling live trading. Run the smoke test with:

```bash
python scripts/smoke_test.py --api-base-url https://YOUR-API-DOMAIN --telegram --redis
```

After each deployment, follow `docs/DEPLOYMENT_VERIFICATION_RUNBOOK.md` to verify API, bot, Mini App, workers, beat, WalletConnect, order reconciliation, and rollback readiness.
