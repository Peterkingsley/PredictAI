# PredictAI unified backend

Fastify + TypeScript API shared by the Expo mobile app and React desktop web app. It implements authentication, markets, paper predictions, PredictAI intelligence, Posts/social, notifications, profiles, support, and a complete sandbox wallet behind injectable repositories and providers.

The wallet is deliberately non-custodial and non-production. It never creates private keys, signs or broadcasts blockchain transactions, generates usable deposit addresses, or contacts a live cryptocurrency API. Sandbox deposits and withdrawals exercise the complete product flow against an immutable in-memory ledger. Live deposits, live withdrawals, custody, wallet connections, and real-money prediction funding remain disabled.

## Run locally

```powershell
cd C:\Users\peter\.vscode\PredictAI\backend
Copy-Item .env.example .env
npm install
npm run dev
```

- API: `http://localhost:4000/v1`
- OpenAPI UI: `http://localhost:4000/docs`
- Health: `http://localhost:4000/health`
- Readiness: `http://localhost:4000/ready`

Development Google login accepts the deliberately scoped token format `dev:email:subject:name`. Test builds inject a mock verifier. Production requires one or more Google client IDs and a non-development access-token secret.

## Sandbox wallet

Every authenticated user gets one internal wallet account. The configured `PAPER_STARTING_BALANCE` becomes a one-time `sandbox_credit` ledger entry. Balances are calculated from immutable integer-minor-unit entries; they are not independently stored or changed with floating-point arithmetic.

Supported assets are `USDC` and `USDT`. Canonical network IDs are `ethereum`, `polygon`, `arbitrum`, and `base`. Generated deposit addresses begin with `sandbox_` and cannot be mistaken for valid EVM addresses. Generated transaction IDs begin with `sandbox_tx_`.

`PAYMENT_PROVIDER=sandbox` is the only enabled provider. `PAYMENT_API_KEY`, `PAYMENT_IPN_SECRET`, and `PAYMENT_API_BASE_URL` are reserved for a later approved provider and are not needed in sandbox mode.

Development-only simulators are registered only when `NODE_ENV` is not `production`:

- `POST /v1/dev/wallet/deposits/:id/simulate`
- `POST /v1/dev/wallet/withdrawals/:id/complete`

The public configuration endpoints expose `wallet.mode: "sandbox"`, `liveDeposits: false`, and `liveWithdrawals: false`. Clients must show a sandbox label and must never describe these transactions as on-chain.

## Commands

```powershell
npm run typecheck
npm test
npm run build
npm start
```

## Architecture

- `src/api`: versioned Fastify routes, validation, authentication, and rate limits.
- `src/services/wallet`: overview, preferences, trusted addresses, audit, and webhook orchestration.
- `src/services/ledger`: immutable ledger and calculated balances.
- `src/services/deposits`: idempotent deposit-intent lifecycle.
- `src/services/withdrawals`: quote, validation, idempotent confirmation, and lifecycle.
- `src/integrations/payments`: provider contract and the only enabled implementation, `SandboxPaymentProvider`.
- `src/models/wallet` and `src/models/ledger`: canonical wallet domain types.
- `src/repositories`: persistence boundaries and fixture-seeded in-memory adapter.
- `src/core`: configuration, security, events, errors, and money utilities.
- `tests`: no-network Fastify injection and service-contract tests.

The repository and payment-provider interfaces are the replacement boundaries for production infrastructure. `MemoryRepository` is intentionally non-durable and resets on restart.

See [CLIENT_INTEGRATION.md](./CLIENT_INTEGRATION.md) for the mobile and desktop replacement map and the complete wallet request sequence.
