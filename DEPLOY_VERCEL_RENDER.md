# Deploying CareConnect — Vercel (frontend) + Render (API + Postgres)

Target architecture:

| Component | Host | Notes |
|-----------|------|-------|
| Frontend (`my-app/`) | **Vercel** | Vite SPA. Needs SPA rewrites (`my-app/vercel.json`). |
| Backend (`backend/`) | **Render** (Docker web service) | Reuses `backend/Dockerfile`. Health check at `/health`. |
| Database | **Render Postgres** | Schema from `backend/migrations/init.sql`. |

> Config files in this repo: `render.yaml` (Render blueprint), `my-app/vercel.json`
> (SPA routing). There is **no root `package.json`** — each app lives in its own
> directory, so set the platform "Root Directory" accordingly.

---

## Prerequisites you'll need before starting

- Your **Firebase service-account JSON** (the six `FIREBASE_*` values). The private key
  keeps its literal `\n` sequences — the backend converts them to real newlines.
- The matching **Firebase web config** (`VITE_FIREBASE_*`) for the frontend.
- **Whish Money credentials** (sandbox is fine) — see the note below.
- `psql` installed locally (or a GUI like DBeaver/pgAdmin) to load the DB schema.
- Both apps pushed to a GitHub repo Vercel and Render can read.

### Whish / payments — read this first

`backend/src/config/env.ts` **hard-requires** the four `WHISH_*` variables when
`NODE_ENV=production` and calls `process.exit(1)` without them. So:

- **Real launch / real payments:** paste all four `WHISH_*` values from your Whish account.
- **Portfolio demo without payments yet:** set `NODE_ENV=development` on the Render
  service (instead of `production`) so the built-in `.invalid` placeholders apply.
  Payments simply won't work; everything else boots. `DB_SSL=require` is set
  explicitly, so TLS still works. Flip back to `production` + real Whish creds before
  going live.

---

## A. Backend + database on Render (Blueprint)

1. Push these config changes to GitHub (`main`).
2. **Render Dashboard → New → Blueprint** → connect this repo. Render detects `render.yaml`.
3. **Apply.** Render provisions:
   - `careconnect-db` (PostgreSQL)
   - `careconnect-api` (Docker web service)
   It auto-maps `DB_HOST/PORT/NAME/USER/PASSWORD` from the database — no manual copy.
4. Fill the `sync: false` secrets under **careconnect-api → Environment**:
   - Firebase: the six `FIREBASE_*` fields from your service-account JSON.
   - Whish: real creds, **or** set `NODE_ENV=development` for a no-payments demo.
5. **Load the schema.** From `careconnect-db → Connections`, copy the **external** psql
   connection string:
   ```bash
   psql "<external-connection-string>" -f backend/migrations/init.sql
   psql "<external-connection-string>" -c '\dt'   # expect ~14 tables
   ```
   No `psql`? Connect DBeaver/pgAdmin to that string, open a SQL editor, paste
   `init.sql`, run. **Skip** `fixtures/dev_seed.sql` and `fixtures/sample_bookings.sql`
   (dev-only / legacy and will fail against the current schema).
6. Copy the live API URL, e.g. `https://careconnect-api.onrender.com`.

> If a `fromDatabase` property ever fails to resolve, copy the five values manually from
> the DB's **Connections** tab into `DB_HOST/PORT/NAME/USER/PASSWORD` — the code is
> unchanged. `DB_SSL=require` is required because Render's certificate isn't in Node's
> CA bundle (the code's production default of strict-verify would fail the handshake).

## B. Frontend on Vercel

1. **Vercel → Add New → Project** → import this repo.
2. **Set Root Directory = `my-app`** (critical — no root `package.json`; the build fails otherwise).
3. Framework Preset auto-detects **Vite**. Build command `npm run build`, Output `dist`.
4. **Before the first build**, add Environment Variables (they're inlined at build time —
   a missing `VITE_API_URL`/`VITE_FIREBASE_*` fails the build):
   - `VITE_API_URL` = `https://careconnect-api.onrender.com/api`
     (Render URL + `/api`, no trailing slash)
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
     `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
   - Optional: `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_GOOGLE_MAPS_API_KEY` (booking map)
5. Deploy. Copy the Vercel URL, e.g. `https://careconnect.vercel.app`.

## C. Wire frontend ↔ backend

1. Render → **careconnect-api → Environment**:
   - `FRONTEND_URL` = `https://careconnect.vercel.app` (exact origin, **no trailing slash**)
   - `BACKEND_URL` = `https://careconnect-api.onrender.com`
   Save → triggers a redeploy.
2. Warm the API (free services sleep): `curl https://careconnect-api.onrender.com/health`
   → `{"status":"OK",...}`

---

## Verification

- `GET https://careconnect-api.onrender.com/health` → `{"status":"OK"}`.
- Open the Vercel URL — homepage renders.
- Visit `/sitters` — sitter cards load (exercises frontend → API → DB + CORS).
- CORS/401? Confirm `FRONTEND_URL` exactly matches the Vercel origin (no trailing slash)
  and `VITE_API_URL` ends in `/api`. **Vercel preview deploy URLs are different origins
  and are blocked by CORS** (single-origin allowlist) — only the production domain passes.

## Before a real launch (caveats)

- **Render free Postgres is deleted 90 days after creation** — upgrade before real data exists.
- **Render free web service sleeps after ~15 min idle** → first request takes ~50s.
- `DB_SSL=require` encrypts the DB connection but does **not** verify Render's certificate
  (acceptable pre-launch; revisit pinned-CA verification later).
- Deploying does **not** resolve the open security hardening items tracked in
  `.claude/plans/careconnect-hardening.md` (e.g. the forgeable Whish callback test-mode
  fallback). Address those before a public launch.
