# PredictAI Desktop Web App

Independent desktop-class React application for the authenticated PredictAI product. It is intentionally separate from the Expo application in `../app` and the public download site in `../web`.

## Run locally

```powershell
cd desktop-webapp
npm install
npm run dev
```

Production verification:

```powershell
npm run typecheck
npm run build
npm run preview
```

Copy `.env.example` to `.env` and set `VITE_PUBLIC_DOWNLOAD_URL` to the public app-download site before deployment. Phone-class browsers are redirected there before authenticated UI is rendered; a safe explanatory screen is used when the variable is absent.

## Architecture

- `src/layouts` — authentication guard, phone-browser guard, collapsible desktop shell, top bar, and contextual rail.
- `src/pages` — URL-addressable auth, Predict, Intelligence, Posts, Assets, account, and notification flows.
- `src/components` — reusable accessible UI, market/trading, chart, and social components.
- `src/store` — persistent session and prototype product state via React context and local storage.
- `src/services` — current market, social, wallet, and notification fixtures ported from the active mobile product.
- `src/utils` — browser-native clipboard/share fallbacks.
- `src/styles` — desktop design tokens, layout, interaction states, reduced-motion handling, and wide-screen adaptation.

## Main routes

- Auth: `/login`, `/signup`, `/password`, `/forgot-password`
- Predict: `/app/predict`, `/app/search`, `/app/market/:id`, `/app/market/:id/intelligence`
- Posts: `/app/posts`, `/app/posts/new`, `/app/posts/:id`, `/app/posts/search`, `/app/posts/leaderboard`, `/app/posts/saved`, `/app/posts/market/:id`
- Public identity: `/app/posts/profile/:id`, followers/following/portfolio routes, profile edit, social privacy, portfolio and position share builders
- Assets: `/app/assets`, deposit, withdraw, scan, history, and settings routes
- Account: `/app/account`, `/app/notifications`

## Browser adaptations

- The Expo image picker is a validated desktop file input with persistent local preview.
- Camera scanning uses a browser camera preview and always provides validated manual EVM-address entry when browser QR decoding or permission is unavailable.
- Clipboard and native share use capability detection with copy fallback.
- Mobile biometric controls become passkey-ready, capability-aware UI and never report a fake authentication success without a backend challenge.
- Mobile sheets and bottom navigation are replaced by desktop dialogs, route pages, a persistent sidebar, and contextual rails.

## Mobile parity audit

All screens reachable through the current `App.tsx` and `MainAppScreen.tsx` navigation have desktop equivalents. `app/src/screens/HomeScreen.tsx` is intentionally not ported because it is orphaned legacy code and is not imported by the active app. `BiometricScreen.tsx` is browser-adapted into passkey-ready auth/security controls rather than copied as an Expo hardware-authentication screen.

Backend services remain intentionally mocked, matching the current frontend product: account creation and recovery delivery, identity verification, live balances and settlement, passkey challenges, payment transactions, connected-wallet authorization, media storage, support messaging, push delivery, and live AI/market feeds require production APIs.
