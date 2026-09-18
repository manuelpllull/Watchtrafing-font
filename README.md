# WatchTrading Frontend

Astro + React + TypeScript PWA for the WatchTrading API.

## Run Locally

Start the backend from the repository root:

```bash
cd /Users/manuel/RiderProjects/WatrchTrading-back
```

Then start the frontend in a second terminal:

```bash
cd /Users/manuel/RiderProjects/WatrchTrading-back/WatchTrading-front
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

The development server proxies `/api/*` to `http://localhost:5000`, so no local CORS configuration is needed. Leave `VITE_API_BASE_URL` empty for this setup. Use `.env.example` as the production configuration template.

## PWA Preview

The service worker is generated during a production build, not during development:

```bash
npm run build
npm run preview
```

Open the preview URL, then use the browser install control to install the app. The build output includes `manifest.webmanifest` and `sw.js`.

## Checks

```bash
npm run typecheck
npm run build
```

## Included Flows

- Registration, login, refresh, email verification, password reset
- Collection management with watch details, expenses, shares, and archiving
- Private client CRM with contact details, marketplace links, platform-user linking, and preserved trade history
- Sale recording from the watch form, including platform users, CRM clients, and external buyers
- Trade confirmation, rejection, cancellation, in-transit, and completion actions
- Reputation lookup and shared counterparty history
- Profile editing and directional user blocking
- Personal activity timeline and admin global activity view
- Admin brand catalog management

For a production deployment with the API on a different origin, set `VITE_API_BASE_URL` and enable CORS on the backend for the frontend origin.
