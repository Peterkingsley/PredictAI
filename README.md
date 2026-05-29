# PredictAI

PredictAI is a Telegram bot for browsing Polymarket prediction markets, receiving AI-style market analysis, connecting wallets, and preparing for non-custodial trading flows.

This repository contains the production app scaffold:

- `bot/` Telegram bot handlers and message UI
- `api/` FastAPI backend
- `db/` SQLAlchemy models and CRUD helpers
- `workers/` Celery jobs for market cache refreshes
- `mini-app/` Telegram Mini App placeholder for WalletConnect

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

Trading routes and wallet signing are intentionally scaffolded but not enabled for real funds yet.

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
