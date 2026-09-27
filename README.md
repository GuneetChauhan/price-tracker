# INE Product Price Tracker

A small full-stack app that tracks product price/stock over time by scraping
INE's hosted mock store (`https://demo.inelabteamdev.com/`) on a fixed
2-hour schedule.

## Stack
- **Frontend:** React (Vite) → Vercel
- **Backend:** Node.js + Express + Playwright → Render
- **Database:** Supabase (Postgres)
- **Scheduling:** cron-job.org hits a backend endpoint every 2 hours (chosen over an in-process timer because Render's free tier sleeps the instance)

## Why Playwright, not lightweight HTTP fetching
The store's homepage returns almost no server-rendered HTML — it's a
client-rendered SPA, and the product listing, prices, and stock are all
populated by JavaScript after load, with some content appearing after a
short delay. A plain `fetch` + `cheerio` scrape would see an empty shell.
Playwright (headless Chromium) is used so the scraper waits for the actual
rendered DOM before reading anything.

## Project structure
```
backend/    Express API + Playwright scraper
frontend/   React dashboard
supabase/schema.sql   run once in the Supabase SQL editor
```

## Setup

### 1. Supabase
1. Create a free Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Copy the project URL and the `service_role` key (Settings → API).

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
npm install
npx playwright install chromium
npm run dev             # http://localhost:4000
```

Before this actually works against the live store, open
`backend/src/scraper/selectors.js` and fill in the real CSS selectors — see
the comment at the top of that file for the exact `playwright codegen`
command to get them in about two minutes. That file is intentionally the
only place selectors live, so a page-structure change only needs a change
there, not in the retry/logging logic.

### 3. Frontend
```bash
cd frontend
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:4000 for local dev
npm install
npm run dev              # http://localhost:5173
```

### 4. Deploy
- **Backend → Render:** new Web Service from this repo's `backend/` directory. Build: `npm install && npx playwright install --with-deps chromium`. Start: `npm start`. Add the same env vars as `.env.example`.
- **Frontend → Vercel:** import `frontend/` as the project root. Set `VITE_API_BASE_URL` to the deployed Render URL.
- **Cron → cron-job.org:** create a job that sends `POST https://<render-url>/api/scrape/run?token=<CRON_SECRET>` every 2 hours.

## Running the observable (headed) scraper
```bash
cd backend
npm run scrape:headed
```
This runs `runBatch()` with a visible browser window, so you can watch it
navigate, wait for async content, and retry on a slow/failing load — this is
what the submitted screen recording shows.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | backend | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | server-side DB access (never exposed to frontend) |
| `STORE_BASE_URL` | backend | mock store base URL |
| `CRON_SECRET` | backend | shared secret the cron job must send |
| `HEADLESS` | backend (local only) | `false` for the headed demo run |
| `VITE_API_BASE_URL` | frontend | URL of the deployed backend |

## Scraping schedule
Every 2 hours, triggered by an external cron call to
`POST /api/scrape/run?token=...` (see above), rather than an always-on loop,
because Render's free tier sleeps idle instances.

## API summary
- `GET /api/search?q=` — live search against the store
- `POST /api/products` — start tracking a product/option
- `GET /api/products` — list tracked products + latest reading
- `DELETE /api/products/:id` — stop tracking
- `GET /api/products/:id/history` — successful price/stock points, for the chart
- `GET /api/products/:id/log` — full scrape attempt log, including failures
- `GET /api/export/csv` — full history across all products, one row per attempt
- `POST /api/scrape/run?token=` — cron entry point
