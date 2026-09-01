# Client integration map

Set a platform-specific API base URL ending in `/v1`; store the short-lived access token in memory and the rotating refresh token in the platform secure store. Send `Authorization: Bearer <accessToken>`, `X-Request-Id`, and optionally client/version headers. Do not store refresh tokens in desktop `localStorage`.

| Client area              | Backend contract                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Login/session            | `POST /auth/google`, `/auth/refresh`, logout and session routes                                   |
| Initial app state        | `GET /bootstrap`, then `GET /app-config` as needed                                                |
| Event home/search/detail | `/markets`, `/markets/suggestions`, `/market-categories`, `/markets/:id`, history/community/posts |
| Prediction modal         | `POST /predictions/quote` (shows potential win), then `POST /predictions` with `Idempotency-Key`  |
| Assets                   | `/wallet/summary`, `/wallet/history`, `/positions`, wallet settings and trusted addresses         |
| PredictAI intelligence   | preview, analysis, and refresh under `/intelligence`                                              |
| Posts                    | feed, CRUD, interactions, replies, users, search, leaderboard, safety routes                      |
| Notifications            | `/notifications`, unread/read routes, `/devices`, notification preferences                        |
| Profile/avatar           | `/me`, `/me/profile`, multipart `/me/avatar`, preferences/privacy                                 |
| Help                     | `/support/tickets`                                                                                |

## Desktop localStorage replacement

- `predictai.session` → Google access/refresh token flow and `/bootstrap`.
- `predictai.posts` → Posts API.
- Local user/follow/like/save/repost state → social API endpoints.
- `predictai.photo` → multipart avatar endpoint and returned `avatarUrl`.
- Local wallet settings → `/wallet/settings` and trusted-address routes.
- Fixture markets/notifications → markets and notifications APIs.

Keep only harmless UI preferences locally when offline behavior is desired; the server remains authoritative for privacy, balances, predictions, public metrics, and attached snapshots.

## Required frontend alignment

- Remove identity-verification/KYC UI; the product brief explicitly excludes KYC.
- Replace email/password and Apple sign-in UI with Google-only authentication.
- Mark deposit, withdrawal, wallet connection, and trading flows unavailable while `custody`, `externalWalletConnections`, and `realMoneyExecution` feature flags are false.
- Never present a disabled withdrawal as submitted or successful.
- Use server-returned AI analysis and portfolio/position snapshots; never trust client-supplied performance or AI numbers.
- Continue displaying crypto outcome buttons as Buy/Sell, while probability remains available in market detail and analysis data.

## Production configuration still required

Durable database/repository adapter, production market data provider, production AI provider if desired, object storage for avatars, real push providers, Google OAuth client IDs/secrets, legal URLs, observability, and deployment secrets. Custody and real execution require a separate security/compliance project and are not enabled by this codebase.
