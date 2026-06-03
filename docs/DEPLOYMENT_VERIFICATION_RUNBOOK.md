# PredictAI Deployment Verification Runbook

MVP closeness: 94%.

Use this runbook after every deployment that touches the API, bot, Mini App, workers, environment variables, Polymarket submission, WalletConnect, or order reconciliation.

This runbook is operational. `docs/LAUNCH_CHECKLIST.md` remains the go/no-go checklist before enabling live trading.

## 1. Deployment Order

Deploy in this order when multiple services changed:

1. Database-affecting code and API.
2. Celery worker.
3. Celery beat.
4. Telegram bot worker.
5. Mini App static service.

If only the Mini App changed, redeploy the Mini App only. If only bot copy or commands changed, redeploy the bot worker only.

## 2. Required Service Matrix

API service must have:

- `DATABASE_URL`
- `REDIS_URL`
- `TELEGRAM_BOT_TOKEN`
- `MINI_APP_URL`
- `CORS_ORIGINS`
- `POLYGON_RPC_URL`
- `POLYMARKET_HOST`
- CLOB credentials when live submission is enabled
- `POLYMARKET_ORDER_SUBMISSION_ENABLED`
- `POLYMARKET_USDC_SPENDER`

Bot worker must have:

- `TELEGRAM_BOT_TOKEN`
- `BOT_USERNAME`
- `DATABASE_URL`
- `REDIS_URL`
- `MINI_APP_URL`
- `ADMIN_TELEGRAM_IDS`
- Polymarket and Polygon variables used by trade readiness checks

Celery worker must have:

- `DATABASE_URL`
- `REDIS_URL`
- `TELEGRAM_BOT_TOKEN`
- Polymarket CLOB credentials for order status sync
- `POLYGON_RPC_URL`

Celery beat must have:

- `REDIS_URL`
- the same worker code version as the Celery worker

Mini App static service must have:

- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_API_BASE_URL`
- `VITE_APP_URL`

## 3. Immediate Post-Deploy Checks

Check API health:

```bash
curl https://YOUR-API-DOMAIN/health
```

Expected:

```json
{"status":"ok"}
```

Check trading readiness:

```bash
curl https://YOUR-API-DOMAIN/trades/readiness
```

Expected:

- Response is valid JSON.
- Missing config is explicit.
- Live submission status matches your intended deployment state.

Check markets:

```bash
curl "https://YOUR-API-DOMAIN/markets/top?limit=3"
```

Expected:

- Current active markets.
- No stale, closed, archived, or missing-token markets.
- Market payload includes enough token data for order creation.

## 4. Smoke Test

Run the non-destructive smoke test after the deploy:

```bash
python scripts/smoke_test.py --api-base-url https://YOUR-API-DOMAIN --telegram --redis
```

Pass criteria:

- `/health` passes.
- `/trades/readiness` is reachable.
- Telegram `getMe` returns the expected bot.
- Redis ping succeeds.
- Failures are actionable and expected only when optional local env is missing.

## 5. Telegram Bot Verification

In Telegram, run:

- `/start`
- `/help`
- `/status`
- `/admin_status`
- `/markets`
- `/search bitcoin`
- `/connect`
- `/orders`
- `/sync_orders`

Expected:

- Bot responds without raw tracebacks.
- `/status` and `/admin_status` match the deployed env.
- `/markets` returns active markets.
- `/connect` opens the current Mini App URL.
- `/admin_status` is restricted to configured admins.

## 6. Mini App and WalletConnect Verification

Open the Mini App from Telegram using a fresh `/connect` button.

Verify:

- The page loads the latest deployed UI.
- Reown WalletConnect opens.
- WalletConnect Project ID is not missing.
- The app URL shown in wallet metadata matches `VITE_APP_URL`.
- Wallet connects on Polygon.
- Wallet connection proof/signature completes.
- Telegram receives wallet confirmation.

If pairing fails, test relay access in the same browser:

```js
const ws = new WebSocket("wss://relay.walletconnect.org");
ws.onopen = () => console.log("relay open");
ws.onerror = (event) => console.log("relay error", event);
ws.onclose = (event) => console.log("relay close", event.code, event.reason);
```

If this fails with DNS or close code `1006`, fix network, DNS, VPN, firewall, or browser filtering before debugging app code.

## 7. Worker and Beat Verification

In the hosting dashboard, confirm:

- Celery worker service is running the latest deploy.
- Celery beat service is running the latest deploy.
- Worker logs show no repeated import, database, Redis, or credential errors.
- Beat logs show the reconciliation schedule is active.

Expected recurring task:

- `workers.tasks.reconcile_trade_orders` every 90 seconds.

If worker is healthy but reconciliation does not run, restart beat first, then worker.

## 8. Order Lifecycle Verification

Use a non-live or safety-gated flow first when possible.

Verify:

- `/bet [market]` performs pre-trade checks.
- Low allowance opens Mini App approval flow.
- Signing intent reaches `SIGNED` only after wallet signature verification.
- Queued, failed, or disabled-live-submission orders appear in `/orders`.
- `/retry_order [id]` works only for safe retry states.
- `/cancel_order [id]` works only for cancellable live orders.
- `/sync_orders` reports checked orders and status changes.

## 9. Live Submission Gate

Keep this disabled until all previous checks pass:

```text
POLYMARKET_ORDER_SUBMISSION_ENABLED=false
```

Before enabling live submission:

- API and worker are deployed from a Polymarket-supported region.
- Polymarket credentials are valid.
- Trading wallet has required USDC and gas.
- `POLYMARKET_USDC_SPENDER` is correct.
- Admin `/admin_status` shows no missing live-trading config.
- You are ready to monitor `/orders`, `/sync_orders`, worker logs, and Polymarket account state.

After enabling live submission:

1. Restart API.
2. Restart bot worker.
3. Restart Celery worker.
4. Restart Celery beat.
5. Run the smoke test again.
6. Run `/admin_status`.
7. Place only a tiny controlled live order.

## 10. Rollback Criteria

Rollback or disable live submission immediately if:

- API health fails.
- Bot stops responding.
- Wallet signatures complete but Telegram receives no confirmation.
- Orders are submitted but not tracked locally.
- Reconciliation repeatedly fails.
- Polymarket returns geoblock or credential errors.
- Users see raw exception text.

Emergency safety rollback:

```text
POLYMARKET_ORDER_SUBMISSION_ENABLED=false
```

Then restart API, bot, worker, and beat.

## 11. Post-Deploy Record

After each deployment, record:

- Date and time.
- Git commit hash.
- Services redeployed.
- Smoke test result.
- `/admin_status` result.
- Any failed check and fix applied.
- Whether live submission remained disabled or was enabled.

