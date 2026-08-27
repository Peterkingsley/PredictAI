# PredictAI Mobile

Expo SDK 57 TypeScript application for Android and iOS.

## Run locally

Use Node.js 22 LTS or newer, then run `npm install` and `npm run start`.

Use a development build to test Face ID on iOS. The sign-up, login, password, and biometric screens are implemented. Password authentication currently uses a local service boundary until the backend contract exists. Google and Apple buttons are visual placeholders until provider credentials are configured.

## Implemented product flows

- Portfolio home with balances, shortcuts, market movers, and bottom navigation.
- Predict discovery with Recommend, Sports, and Crypto categories.
- Reusable market cards and an expandable All Markets bottom sheet.
- Market detail charts, outcome pricing, game lines, spreads, totals, rules, and timeline.
- Swipe-style Explore discovery cards with skip and favorite actions.
- Prediction assets, positions, orders, and filled-order empty states.
- Funds History categories and filtering UI.
- Prediction Mode and Trading Mode selection sheet.

Market values currently come from local typed fixture data and are ready to be replaced by backend API responses.
