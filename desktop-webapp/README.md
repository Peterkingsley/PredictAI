# Desktop Web App

Authenticated PredictAI product for desktop-class browsers.

```text
public/          static assets
src/
  components/    shared desktop UI
  features/      product modules grouped by domain
  layouts/       authenticated shells and navigation
  pages/         route-level views
  services/      backend API integrations
  store/         client state and cached server state
  styles/        desktop design system and global styles
  types/         shared desktop TypeScript types
```

A mobile-device guard should redirect phone browsers to the public download website instead of rendering the product interface.
