# Client integration map

Set a platform-specific API base URL ending in `/v1`. Store the short-lived access token in memory and the rotating refresh token in the platform secure store. Send `Authorization: Bearer <accessToken>` and `X-Request-Id`. Desktop must not store refresh tokens in `localStorage`.

## Shared application contracts

| Client area            | Backend contract                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Login/session          | `POST /auth/google`, `/auth/refresh`, logout, and session routes                                        |
| Initial state          | `GET /bootstrap`, then `GET /app-config` or `GET /app/config` as needed                                 |
| Events                 | `/markets`, `/markets/suggestions`, `/market-categories`, `/markets/:id`, history, community, and posts |
| Prediction modal       | `POST /predictions/quote`, then `POST /predictions` with `Idempotency-Key`                              |
| PredictAI intelligence | Preview, analysis, and refresh under `/intelligence`                                                    |
| Posts                  | Feed, CRUD, interactions, replies, users, search, leaderboard, and safety routes                        |
| Notifications          | `/notifications`, unread/read routes, devices, and notification preferences                             |
| Profile/avatar         | `/me`, `/me/profile`, multipart `/me/avatar`, preferences, and privacy                                  |
| Help                   | `/support/tickets`                                                                                      |

## Wallet frontend replacement

| Current frontend source             | Replace with                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Desktop local wallet state          | `GET /wallet` for balances and metrics; server responses remain authoritative                         |
| Mobile fixture balances             | `GET /wallet`, or the same wallet object returned by `GET /bootstrap`                                 |
| Deposit fixtures                    | `POST /wallet/deposits`, then `GET /wallet/deposits/:id` or the paginated list                        |
| Withdrawal fixtures                 | `POST /wallet/withdrawals/quote`, confirmation screen, then `POST /wallet/withdrawals`                |
| Deposit/withdrawal history fixtures | `GET /wallet/history`; use the dedicated list endpoints when a screen needs lifecycle-specific fields |
| Wallet settings fixtures            | `GET /wallet/settings` and `PATCH /wallet/settings`                                                   |
| Saved/trusted-address fixtures      | `GET`, `POST`, and `DELETE /wallet/trusted-addresses`                                                 |
| Local prediction balance mutation   | Prediction endpoints only; the backend ledger performs stake, settlement, and refund entries          |

Never send a `userId` in a wallet request. Ownership comes from the access token and is checked server-side.

### Wallet overview

Call `GET /wallet`. Render each returned decimal string as supplied; do not calculate the authoritative balance in JavaScript. `hideBalances` is a display preference from wallet settings and must not remove P&L values unless the design explicitly provides a separate P&L control.

### Deposit flow

1. Create a unique idempotency key on the client.
2. `POST /wallet/deposits` with `{ "asset": "USDC", "network": "polygon" }` and the `Idempotency-Key` header.
3. Show the returned `sandbox_...` address only inside an obvious Sandbox/Test Funds state.
4. Poll `GET /wallet/deposits/:id`, or refresh `GET /wallet/deposits`, until the status changes.
5. In local development, a developer tool may call `POST /dev/wallet/deposits/:id/simulate` with `{ "amount": "100.00" }`. Production UI must never call or expose this endpoint.

Retrying deposit creation with the same user and idempotency key returns the original intent and cannot create another credit.

### Withdrawal flow

1. Collect an enabled asset, canonical network ID, valid EVM address, and decimal-string amount.
2. `POST /wallet/withdrawals/quote` and display `estimatedFee`, `estimatedReceive`, and `expiresAt` on the confirmation screen.
3. After confirmation, create a unique idempotency key and `POST /wallet/withdrawals` with `{ "quoteId": "..." }`.
4. Show `processing`; poll `GET /wallet/withdrawals/:id` or refresh the paginated list.
5. Local developer tools may call `POST /dev/wallet/withdrawals/:id/complete`. Production UI must never call or expose it.

The quote validates enabled assets, supported networks, address format, amount, available balance, and daily limit. A failed provider callback restores the sandbox debit exactly once.

### History and filters

`GET /wallet/history` accepts `type=deposit|withdrawal|prediction`, `status`, `asset`, `cursor`, and `limit`. Dedicated `GET /wallet/deposits` and `GET /wallet/withdrawals` also accept `asset`, `network`, `status`, `cursor`, and `limit`.

### Settings

`PATCH /wallet/settings` accepts any subset of:

- `defaultNetwork`
- `withdrawalLimit`
- `feeSpeed`
- `transactionNotifications`
- `currency`
- `hideBalances`
- `assetSort`
- `compactView`
- `walletMode`
- `supportedAssets`
- `withdrawalConfirmation`
- `requireBiometrics`
- `autoLock`

At least one of USDC or USDT must remain enabled. Network values sent to the API must be the canonical lowercase IDs `ethereum`, `polygon`, `arbitrum`, or `base`; clients may map them to title-case display labels.

## Sandbox capability handling

Read `wallet` from `/app-config` or `/app/config`:

```json
{
  "enabled": true,
  "mode": "sandbox",
  "liveDeposits": false,
  "liveWithdrawals": false
}
```

The complete deposit and withdrawal UX is available with test funds, but the interface must remain visibly labelled Sandbox. Do not show a blockchain explorer link, imply finality on a real network, or ask users to send real assets. `custody`, `externalWalletConnections`, and `realMoneyExecution` remain false.

## Other prototype cleanup

- `predictai.session` becomes the Google access/refresh-token flow and `/bootstrap`.
- `predictai.posts` and local follow/like/save/repost state become the social API.
- `predictai.photo` becomes multipart `/me/avatar` and the returned `avatarUrl`.
- Fixture markets and notifications become the markets and notifications APIs.
- Server-returned AI analysis and portfolio/position snapshots are authoritative; never trust client-supplied performance or AI values.
- Crypto outcome buttons remain Buy/Sell while probability remains available in market detail and analysis data.

Keep only harmless UI preferences locally when offline behavior is desired.

## Production work still required

Before live payments, add a reviewed durable database/repository adapter, an approved payment/custody provider implementation, KYC/AML and jurisdiction decisions, secure key/custody architecture, signed webhook verification, reconciliation, deposit confirmation policy, withdrawal approval/risk controls, rate-limit infrastructure, secrets management, observability, incident response, and audited deployment configuration. No live provider or custody capability is implemented here.
