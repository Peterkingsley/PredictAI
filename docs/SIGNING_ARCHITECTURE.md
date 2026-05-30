# PredictAI Signing Architecture

PredictAI must stay non-custodial. The backend never receives a user private key and never signs on a user's behalf.

## Current state

The bot supports simulated bets and stores demo positions. Real trading is not enabled yet.

## Target flow

1. Bot gathers market, side, amount, and active wallet.
2. Backend creates a `SigningIntent` with the unsigned order payload.
3. Bot opens the Telegram Mini App with the intent ID.
4. Mini App connects the user's wallet through WalletConnect/Reown AppKit.
5. Mini App verifies the connected address matches the active wallet.
6. Mini App asks the wallet to sign the order/typed data.
7. Mini App posts the signature to `/trades/signing-intents/{id}/complete`.
8. Backend verifies signature ownership before submitting the order to Polymarket.
9. Bot reports success or failure and stores the confirmed position.

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

## WalletConnect implementation note

The current Reown AppKit React installation path uses `@reown/appkit`, `@reown/appkit-adapter-wagmi`, `wagmi`, `viem`, and `@tanstack/react-query`. The Mini App should use that stack for the real wallet UI, with Polygon as the required network.
