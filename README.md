# Waves and Waders

Surf forecast + beach discovery web app built with Next.js (App Router), React, TypeScript, and Tailwind.

## Requirements
- Node.js 20+
- npm
- Supabase project (Auth + database)

## Environment variables
- Copy `.env.example` to `.env.local` and fill in values.
- Never commit real secrets (anything not prefixed with `NEXT_PUBLIC_`).

## Local development
- `npm ci`
- `npm run dev`
- Open `http://localhost:3000`

## Scripts
- `npm run lint` – Next.js ESLint rules (core web vitals)
- `npm run typecheck` – `tsc --noEmit`
- `npm run build` / `npm run start` – production build / server

## Production notes
- Security headers are set in `next.config.ts` (including a CSP in report-only mode).
- API routes set explicit CDN caching headers for forecast/tide data.

