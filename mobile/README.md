# Mobile wrapper (Capacitor)

This repo is a Next.js App Router site with server components + route handlers (e.g. `app/layout.tsx`, `app/api/*`). That means a static export (bundling the web app into a native binary) is **not** feasible without refactoring.

This `mobile/` folder scaffolds a Capacitor wrapper that loads the hosted site URL in an iOS/Android WebView.

## Phase 0 — Repo discovery (wrapper-relevant)

### Next.js setup

- App Router (no Pages Router): `app/` with route groups like `app/(pages)` and `app/(root)` (also stated in `README.md`).
- `next.config.ts`:
  - No `output: "export"` (no static export configured).
  - Security headers (CSP report-only, Permissions-Policy, etc.) via `headers()`.
  - `images.qualities` only; no rewrites/trailingSlash config present.
- No server actions detected (`rg "use server"` returned nothing), but the app still depends on a server runtime.

### SSR/server dependencies that block static export

- Cookies on the server: `app/layout.tsx` (`cookies()`), `lib/supabaseServer.ts` (`createServerComponentClient` + cookies).
- Dynamic pages: `app/(pages)/login/page.tsx` and `app/(pages)/favorites/page.tsx` (`dynamic = "force-dynamic"`).
- Route handlers (API + auth callback): `app/api/*` and `app/api/auth/[...supabase]/route.ts`.

### Auth/session approach

- Supabase auth helpers with cookie-backed sessions:
  - Server: `lib/supabaseServer.ts`, server usage in `app/(pages)/beaches/page.tsx` / `app/(pages)/login/page.tsx`.
  - OAuth callback exchange: `app/api/auth/[...supabase]/route.ts`.
  - Client session context: `components/providers/SupabaseProvider.tsx`.
- Login supports email/password plus Google OAuth: `components/auth/AuthForm.tsx`.

### Map + chart heavy screens

- Primary app screens:
  - Beaches map + list: `app/(pages)/beaches/page.tsx` (uses `components/general/LazyLoad/LazyLoadMap.tsx`).
  - Beach detail dashboard: `app/(pages)/[beach]/overview/page.tsx` + `app/(pages)/[beach]/overview/OverviewPageClient.tsx`.
- Maps:
  - Leaflet + MapLibre (via `@maplibre/maplibre-gl-leaflet`): `components/visuals/LeafletMap.tsx`.
  - Loaded client-only: `components/general/LazyLoad/LazyLoadMap.tsx` (`ssr: false`).
- Charts:
  - Recharts throughout `components/graphs/*` and widgets like `components/visuals/StatTable.tsx`.
- UI kit:
  - shadcn config: `components.json` (and `components/ui/*`).

### Viewport/keyboard/safe-area handling

- `app/layout.tsx` sets `viewportFit: "cover"` and `interactiveWidget: "resizes-content"`.
- `components/general/ViewportVars.tsx` + `components/general/GlobalOverscrollLock.tsx` + `components/general/PathStyleWrapper.tsx` implement mobile Safari/WebView mitigations (visualViewport, keyboard insets, overscroll, stable 100vh).

### Current build/deploy signals

- Scripts: `package.json` (`dev` uses `next dev --turbopack`, plus `build`/`start`).
- Env conventions: `.env.example` includes `NEXT_PUBLIC_SITE_URL` (also used by `lib/seo.ts` and `components/auth/AuthForm.tsx`).
- Vercel is suggested (not proven) by `@vercel/analytics` and `lib/seo.ts` reading `VERCEL_URL`, but there is no `vercel.json` committed.

## Phase 1 — Wrapper strategy

**Chosen: Hosted web app loaded in a WebView.**

Static export/bundled assets would require removing server-only dependencies and `app/api/*` handlers, which is out of scope for a minimal wrapper.

## Phase 2 — Minimal working wrapper setup

### Mobile folder layout

```text
mobile/
  capacitor.config.ts
  package.json
  README.md
  www/
    index.html
```

### One-time setup

From the repo root:

- Web deps: `npm ci`
- Mobile deps: `npm run mobile:install`

Generate native projects (creates `mobile/ios` and `mobile/android`):

- iOS (macOS + Xcode): `npm run mobile:add:ios`
- Android (Android Studio): `npm run mobile:add:android`

### Configure the URL the app should load

Capacitor will set `server.url` when env is provided (see `mobile/capacitor.config.ts`):

1. `MOBILE_SERVER_URL` (recommended for local dev)
2. `NEXT_PUBLIC_SITE_URL` (recommended for production; already used by the web app)

Env files are loaded automatically (if present):

- `mobile/.env.local`, `mobile/.env`
- `../.env.local`, `../.env`

### Dev workflow (hosted WebView)

1. Start the Next dev server:
   - `npm run dev`

2. Point the WebView at a URL reachable from the emulator/device:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator (macOS): `http://localhost:3000`
- Real device: `http://<your-LAN-IP>:3000`

PowerShell (Android emulator):

- `$env:MOBILE_SERVER_URL="http://10.0.2.2:3000"; npm run mobile:run:android`

Bash (iOS simulator):

- `MOBILE_SERVER_URL="http://localhost:3000" npm run mobile:run:ios`

### Release workflow (hosted WebView)

1. Set `NEXT_PUBLIC_SITE_URL` to your production URL (or set `MOBILE_SERVER_URL`).
2. Sync: `npm run mobile:sync`
3. Open IDE:
   - iOS: `npm run mobile:open:ios`
   - Android: `npm run mobile:open:android`

Build artifacts:

- iOS: in Xcode, `Product > Archive` (requires macOS + Xcode).
- Android: in Android Studio, `Build > Generate Signed Bundle / APK` (AAB recommended).

## Phase 3 — Mobile-specific risk checks (no rewrites)

- Viewport/keyboard: already mitigated via `app/layout.tsx` + `components/general/ViewportVars.tsx`.
- Bottom nav/safe-area: `components/general/BottomNav.tsx` is fixed-bottom and safe-area aware.
- Map resizing in WebView: `components/visuals/LeafletMap.tsx` uses `ResizeObserver` + `map.invalidateSize()`.
- Chart performance: `components/general/ScrollPerfHandler.tsx` + `app/globals.css` reduce hover work while scrolling.

Auth risk:

- Google OAuth in a WebView can be unreliable. This repo uses `supabase.auth.signInWithOAuth({ provider: "google" })` in `components/auth/AuthForm.tsx`. For the wrapper MVP, prefer email/password; plan a native auth flow later if needed.

## Phase 4 — Future native features path (Capacitor)

The wrapper loads the hosted site today, so the web bundle currently has no Capacitor JS APIs. When you're ready to add native features, the minimal approach is:

1. Add `@capacitor/core` + needed plugins to the Next.js app (root `package.json`).
2. Add thin wrappers under `lib/native/*` that:
   - check `Capacitor.isNativePlatform()`
   - call the plugin
   - provide a web fallback (or return `null`)

Camera (future):

```ts
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

export async function takePhoto() {
  if (!Capacitor.isNativePlatform()) return null;
  const photo = await Camera.getPhoto({ resultType: "uri", quality: 80 });
  return photo.webPath ?? null;
}
```

Push (future):

- Plugin: `@capacitor/push-notifications`
- Web integration: request permission + register token in a client component, then POST the token to your backend for topic/user association.

Deep links (future):

- Plugin: `@capacitor/app` (`appUrlOpen`)
- Web integration: in a client component, listen for `appUrlOpen`, extract the path, and `router.push()` to the matching Next route (e.g. `/<beach>/overview`).

Subscriptions (future):

- Keep Stripe donations (`app/api/stripe/checkout/route.ts`) as-is.
- Implement subscriptions using StoreKit 2 / Play Billing (or a wrapper like RevenueCat) plus server-side receipt validation.
