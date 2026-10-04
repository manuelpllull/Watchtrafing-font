# ⌚ WatchTrading — Frontend

**Open-source watch collection tracking & pre-owned trade management.**

The web client for [WatchTrading](https://github.com/manuelpllull/WatrchTrading-back): an installable PWA for tracking your watch collection, co-ownership shares, expenses and the full trade lifecycle — including the bilateral confirmation flow between platform users. No listings, no payments, no marketplace: just honest bookkeeping for watch collectors and flippers.

[![Astro](https://img.shields.io/badge/Astro-7-BC52EE)](https://astro.build)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## Features

- **Collection dashboard** — watches owned, collection value and recorded sales profit at a glance
- **Watch management** — brand/model/reference, condition, box & papers, purchase/sale data, additional expenses (repairs, services, shipping, …) with live profit & margin
- **Co-ownership & consignment** — add shareholders (platform users or external partners), accept/reject invitations, split profit by percentage
- **Trade lifecycle UI** — record a sale, confirm or reject as a buyer, mark in transit, complete or cancel; edit trades with automatic re-confirmation from the counterparty
- **Personal CRM** — client records with contact details and marketplace profile links (Chrono24, Vinted, Wallapop), linked to platform accounts when possible
- **Counterparty due diligence** — reputation lookup (completed/cancelled trades, shared history) and per-user blocking
- **Auth done right** — email verification, password reset, silent session refresh with rotating HttpOnly refresh cookies; JWT access token kept in memory/localStorage
- **Per-user color scheme** — light/dark mode with smooth transitions, preference stored server-side and applied on login
- **Installable PWA** — service worker, manifest, safe-area handling for mobile

## Tech stack

| | |
|---|---|
| Framework | Astro 7 (static output) + React 18 islands, React Router for the SPA |
| Language | TypeScript (strict) |
| Data | TanStack Query (caching, mutations, invalidations) |
| Styling | Tailwind CSS 3, custom token system (CSS variables) for theming |
| Icons | lucide-react |
| PWA | vite-plugin-pwa (Workbox) |
| Testing | Vitest |
| Quality | ESLint (typescript-eslint), `astro check` |

The companion [back-end repository](https://github.com/manuelpllull/WatrchTrading-back) (.NET 10 Clean Architecture API) provides the REST contract this app consumes.

## Project structure

```
src/
├── App.tsx           Router + providers (query, auth, toast) composition root
├── api/              Typed API client per domain (watches, trades, clients, …)
├── auth/             AuthContext: session from JWT claims, silent refresh
├── components/       Layout, AccountMenu, modals, toasts, confirm dialog, UI kit
├── layouts/          SpaLayout.astro (HTML shell, fonts, theme bootstrap)
├── lib/              Formatting helpers, theme preferences
├── pages/            Astro route entries (all render the SPA island)
└── screens/          Route-level React screens (dashboard, watches, trades, …)
tests/                Vitest unit tests (API client)
```

## Getting started

### Prerequisites

- Node.js 20+ and npm
- The backend API running locally (see the back-end repo — `docker compose up -d --build` there)

### Dev

```bash
npm install
cp .env.example .env      # optional; empty VITE_API_BASE_URL uses the dev proxy
npm run dev
```

- App: http://localhost:4321 (also exposed on your LAN via `server.host`)
- In dev, `/api/*` is proxied to `http://localhost:5000` (no CORS hassles)

### Build

```bash
npm run build      # astro check + static output in ./dist
npm run preview
```

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | *(empty)* | Empty → dev proxy to `http://localhost:5000`. Set to the public API origin in production, e.g. `https://api.example.com` |
| `VITE_APP_NAME` | `WatchTrading` | Shown in the UI shell / PWA |

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check (`astro check`) and build for production |
| `npm run typecheck` | `astro check` only |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

## Contributing

Contributions are welcome! Please open an issue first for anything beyond a small fix, keep changes covered by tests (`npm test` and `npm run build` must stay green), and follow the existing conventions — typed API clients in `src/api`, route-level screens in `src/screens`, shared UI in `src/components`.

## License

[MIT](LICENSE)
