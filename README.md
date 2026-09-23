# Waves & Waders

Waves & Waders is a surf forecast and beach discovery app for finding a break and understanding its conditions. Explore beaches on an interactive map, compare surf, swell, wind, and tide forecasts, and save favorite spots for quick access. Beach pages bring forecasts and condition visualizations together in customizable dashboards.

## Features

- Interactive beach maps with viewport-aware discovery, search, and filters
- Forecasts and visualizations for surf, swell, wind, and tides
- Saved beaches and personalized, rearrangeable dashboards
- Responsive interfaces for desktop and mobile

## Built with

- **Next.js App Router, React, TypeScript, and Tailwind CSS** for the application and UI
- **Supabase** for beach and forecast data, authentication, and persistence
- **Leaflet / MapLibre** for interactive maps and **Recharts** for forecast charts
- **Stripe** for donations

## Getting started

### Requirements

- Node.js 20+
- npm
- A Supabase project with the required database schema and Auth configured

### Run locally

1. Copy `.env.example` to `.env.local` and add the required values.
2. Install dependencies with `npm ci`.
3. Start the development server with `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

Keep secret keys out of source control; only values intended for browser use should use the `NEXT_PUBLIC_` prefix.

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |

## Architecture notes

The app uses Next.js API routes to serve beach, forecast, tide, and surf-intensity data. Viewport queries limit map results to the visible area; caching and stale-while-revalidate headers reduce repeated data fetching. Supabase provides the data and authentication layer, while client-side workers handle beach filtering away from the main UI thread.

Security headers are configured in `next.config.ts`; the Content Security Policy is currently report-only.
