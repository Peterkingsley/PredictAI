# PredictAI Production Launch Checklist

Use this checklist before live testing or after every deployment that touches trading, WalletConnect, workers, or environment variables.

## 1. Environment

- `TELEGRAM_BOT_TOKEN` is set on `predictai-bot`, `predictai-api`, and worker services that send Telegram messages.
- `ADMIN_TELEGRAM_IDS` is set on `predictai-bot` and contains your numeric Telegram ID.
- `DATABASE_URL` points to the production database.
- `REDIS_URL` points to the production Redis instance.
- `MINI_APP_URL` points to the deployed Mini App URL.
- `WALLETCONNECT_PROJECT_ID` and `VITE_WALLETCONNECT_PROJECT_ID` are set.
- `VITE_API_BASE_URL` points to the deployed API URL.
- `CORS_ORIGINS` allows the Mini App origin if needed.

## 2. Live Trading Gate

Keep `POLYMARKET_ORDER_SUBMISSION_ENABLED=false` until all smoke tests pass.

Before enabling live submission, confirm:

- `POLYMARKET_PRIVATE_KEY` is a dedicated trading wallet key, not a personal wallet.
- `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, and `POLYMARKET_API_PASSPHRASE` are set.
- `POLYMARKET_SIGNATURE_TYPE` matches the account type.
- `POLYMARKET_FUNDER_ADDRESS` is set if the account type requires it.
- `POLYMARKET_USDC_SPENDER` is set.
- `POLYGON_RPC_URL` is set and reachable.
- The API/worker deployment region is supported by Polymarket.

## 3. Smoke Test

Run locally with production env vars loaded:

```bash
python scripts/smoke_test.py --api-base-url https://YOUR-API-DOMAIN --telegram --redis
```

Expected:

- No required `FAIL` rows.
- `/health` returns `ok`.
- `/trades/readiness` returns the current live-trading readiness.
- Telegram `getMe` returns the bot username.
- Redis ping succeeds.

Optional lighter check:

```bash
python scripts/smoke_test.py --api-base-url https://YOUR-API-DOMAIN
```

## 4. Telegram Bot Checks

In Telegram:

- `/start` responds.
- `/status` shows expected live readiness.
- `/admin_status` works only for admins.
- `/admin_list` shows root/delegated admins.
- `/markets` returns live markets.
- `/search bitcoin` returns results.

## 5. Wallet and Signing Checks

- `/connect` opens the Mini App.
- WalletConnect opens MetaMask/Trust Wallet.
- Wallet connection signature succeeds.
- Telegram receives wallet connection confirmation.
- `/bet [market]` creates a signing request.
- Mini App shows USDC approval before signing when allowance is low.
- Signing returns Telegram confirmation.

## 6. Order Lifecycle Checks

- `/orders` shows the order dashboard.
- `/sync_orders` reconciles submitted/open orders.
- `/retry_order [id]` works for failed/queued signed orders only.
- `/cancel_order [id]` works for open/partially filled orders only.
- Celery worker and beat are running.
- Automated reconciliation notifications arrive when order status changes.

## 7. Go/No-Go

Go live only when:

- Admin status is accessible to you.
- Smoke test passes.
- Bot worker, API, Celery worker, and Celery beat are all healthy.
- API and worker run from a Polymarket-supported region.
- You have confirmed the trading wallet has USDC and MATIC for gas.
- `POLYMARKET_ORDER_SUBMISSION_ENABLED=true` is set only after the above checks pass.
