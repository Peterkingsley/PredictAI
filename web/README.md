# Mobile Download Website

Public, mobile-first landing page for PredictAI.

Its job is to explain the product briefly and direct visitors to the Android or iOS app store. It must not include the authenticated PredictAI web application.

```text
public/          static assets and metadata
src/
  components/    landing-page sections and shared UI
  pages/         public landing/download pages
  styles/        responsive landing-page styles
```

Store buttons should use device-aware links, with a safe fallback when the visitor's platform cannot be identified.
