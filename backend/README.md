# PredictAI unified backend

Fastify + TypeScript API for the Expo mobile app and React desktop web app. It implements account, market, paper-prediction, PredictAI intelligence, Posts/social, notification, wallet-preference, support, and bootstrap contracts behind injectable repositories and providers.

This backend intentionally does **not** implement KYC, custody, private-key handling, transaction signing, withdrawal broadcasting, or real-money execution. Predictions use a virtual in-memory ledger. Deposit, withdrawal, wallet-connection, and real execution providers return typed disabled errors until separately configured and reviewed.

## Run locally

```powershell
cd C:\Users\peter\.vscode\PredictAI\backend
Copy-Item .env.example .env
npm install
npm run dev
```

API: `http://localhost:4000/v1`

OpenAPI UI: `http://localhost:4000/docs`

Health: `http://localhost:4000/health`
Readiness: `http://localhost:4000/ready`

Development Google login accepts a deliberately scoped token shaped as `dev:email:subject:name`. Test builds inject a mock verifier. Production requires one or more Google client IDs plus a non-development access-token secret.

## Commands

```powershell
npm run typecheck
npm test
npm run build
npm start
```

## Architecture

- `src/api`: versioned Fastify route modules, validation, and response contracts.
- `src/services`: domain rules and privacy-aware serialization.
- `src/repositories`: persistence interfaces and fixture-seeded in-memory adapter.
- `src/core`: typed configuration, security, provider boundaries, events, errors, and money utilities.
- `src/fixtures`: normalized development market provider data.
- `src/workers`: scheduler abstraction and development workers.
- `tests`: no-network Fastify injection and client-contract tests.

The repository interface is the database-ready boundary. A production adapter can replace `MemoryRepository` without moving rules into route handlers. The in-memory implementation is intentionally non-durable and resets on restart.

See [CLIENT_INTEGRATION.md](./CLIENT_INTEGRATION.md) for the frontend service map and required prototype cleanup.
