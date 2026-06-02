# PredictAI Signing Architecture

PredictAI must stay non-custodial. The backend never receives a user private key and never signs on a user's behalf.

## Current state

The bot supports live market browsing, wallet connection, typed-data order signing, backend signature verification, and a safety-gated Polymarket CLOB submission bridge.

The Telegram bot creates a backend `SigningIntent` at order confirmation time, sends the user a QR code for the Mini App signing URL, and includes an open-link fallback button. The Mini App loads the intent, requires the connected Polygon wallet to match the intent wallet, signs PredictAI typed order data through WalletConnect/Reown, and submits the signature to `/trades/signing-intents/{id}/complete`.

## Target flow

1. Bot gathers market, side, amount, and active wallet.
2. Backend creates a `SigningIntent` with the unsigned order payload.
3. Bot sends a QR code and open-link button for the Mini App signing URL with the intent ID.
4. User scans the QR code or taps the link, then opens MetaMask, Trust Wallet, or another WalletConnect-compatible wallet.
5. Mini App verifies the connected address matches the active wallet.
6. Mini App asks the wallet to sign the order/typed data.
7. Mini App posts the signature to `/trades/signing-intents/{id}/complete`.
8. Backend verifies signature ownership before submitting the order to Polymarket.
9. Chain/indexer infrastructure calls `/trades/webhooks/transaction-finalized` after finality.
10. Backend records the finalized status and sends the user a Telegram confirmation.

Live Polymarket submission remains controlled by `POLYMARKET_ORDER_SUBMISSION_ENABLED` and required CLOB credentials so production can be tested safely before live orders are enabled.

## Boundaries

- Backend may construct unsigned order payloads.
- Mini App owns wallet connection and signature prompts.
- User wallet signs.
- Backend verifies signatures and submits signed orders.
- Private keys are never logged, stored, pasted, or transmitted.

## API scaffold

- `POST /trades/signing-intents`
- `GET /trades/signing-intents/{intent_id}`
- `POST /trades/signing-intents/{intent_id}/complete`
- `POST /trades/webhooks/transaction-finalized`

## WalletConnect implementation note

The current Reown AppKit React installation path uses `@reown/appkit`, `@reown/appkit-adapter-wagmi`, `wagmi`, `viem`, and `@tanstack/react-query`. The Mini App should use that stack for the real wallet UI, with Polygon as the required network.
