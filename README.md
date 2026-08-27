# PredictAI

PredictAI is being rebuilt as four separate applications that share one product architecture.

## Projects

- `backend/` — API, authentication, data, AI/prediction services, and tests.
- `app/` — Expo + TypeScript mobile app for Android and iOS, built and distributed with EAS.
- `web/` — mobile-first public landing/download site. It does not contain the authenticated product.
- `desktop-webapp/` — authenticated desktop browser application.

## Platform routing

```text
Phone browser -> web landing page -> App Store / Google Play download
Android/iOS app -> native Expo application -> backend
Desktop browser -> desktop web app -> backend
```

The desktop web app must not be exposed as a mobile web app. Mobile visitors who reach a desktop-app URL should be sent to the download landing page in `web/`.

## Build order

1. Use the supplied Android/iOS screens to establish the mobile design system and navigation.
2. Implement the Expo application and its API contracts.
3. Build backend endpoints against those contracts.
4. Build the mobile download landing page.
5. Build the desktop web app using the same backend contracts.

No framework dependencies have been installed yet. That avoids locking the rebuild into implementation choices before the product screens are reviewed.
