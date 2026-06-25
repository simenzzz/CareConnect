# CareConnect — Deploy & Verification Runbook

This runbook covers two things:

1. **How to build and run the whole app** (local dev + production builds).
2. **The six manual verification steps** (R1, R6, O1–O4) that close the gap automated
   tests can't — they need a real browser, a real database, and the GCP / Firebase / Whish
   consoles. Each step is a copy-pasteable checklist.

> **State note.** The CareConnect hardening work (R1–R6, O1–O4) is **already committed and
> green**. Some older verification notes predate commit `5d09800 chore(db): consolidate schema init`
> and describe numbered migration files (`000_init.sql` … `004_…`) and a hardcoded Maps key.
> Those are **stale**. The steps below are corrected to the current repo:
> - The schema is a **single** `backend/migrations/init.sql` (authoritative, not "reconstructed").
> - The double-booking `EXCLUDE` constraint is **already inline** in `init.sql:129-132`
>   (`booking_from`/`booking_to` are already `TIMESTAMPTZ`, `btree_gist` is created at the top).
> - The Google Maps key is **env-injected** (`my-app/index.html:12` reads `%VITE_GOOGLE_MAPS_API_KEY%`);
>   the remaining concern is the **git-history leak**, not a live hardcode.
> - There are **no Firebase rules files** in the repo — rule verification is console-only.

---

## 0. Quick start — build & run the whole app

Monorepo with two independently-built apps:

| App | Stack | Dev server | Build |
|-----|-------|------------|-------|
| `backend/` | Express 5, TypeScript, PostgreSQL, Firebase Admin | `:5000` | `tsc` → `dist/` |
| `my-app/` | React 19, Vite, TypeScript, Firebase web SDK, Google Maps | `:5173` | `tsc -b && vite build` → `dist/` |

### Local development (two terminals)

```bash
# terminal 1 — backend (needs backend/.env + a reachable PostgreSQL)
cd backend
npm install
npm run dev          # nodemon src/server.ts  →  API on http://localhost:5000

# terminal 2 — frontend (needs my-app/.env)
cd my-app
npm install
npm run dev          # vite  →  URL printed in the terminal (default http://localhost:5173)
```

Smoke-test the API:

```bash
curl http://localhost:5000/health        # → 200 OK
```

### Production builds

```bash
# backend
cd backend
npm run build         # tsc → dist/
npm start             # node dist/server.js   (reads NODE_ENV, PORT, etc. from env)

# frontend
cd my-app
npm run build         # tsc -b && vite build → dist/   (serve dist/ from any static host)
```

### Fail-fast on missing env (by design — no insecure fallbacks)

Both apps refuse to start without a complete `.env`. Copy the examples and fill them in:

```bash
cp backend/.env.example  backend/.env
cp my-app/.env.example   my-app/.env
```

- **Backend** (`backend/src/config/env.ts`): a Zod schema validates every required var at
  startup. Any missing/malformed var prints the list and **`process.exit(1)`**.
- **Frontend** (`my-app/src/config/env.ts`): a `required()` helper **throws** on the first
  missing var at module load.

### Required environment variables

**Backend** (`backend/.env`):

| Variable | Required | Notes |
|----------|:--------:|-------|
| `NODE_ENV` | has default | `development` (default) · `test` · `production` |
| `PORT` | has default | `5000` (default) |
| `FRONTEND_URL` | ✅ | valid URL — CORS origin |
| `BACKEND_URL` | ✅ | valid URL — public base URL used in payment callbacks |
| `DB_HOST` | ✅ | |
| `DB_PORT` | has default | `5432` (default) |
| `DB_NAME` | ✅ | enable SSL in production |
| `DB_USER` | ✅ | |
| `DB_PASSWORD` | ✅ | no default; real password only |
| `FIREBASE_PROJECT_ID` | ✅ | service-account fields |
| `FIREBASE_PRIVATE_KEY_ID` | ✅ | |
| `FIREBASE_PRIVATE_KEY` | ✅ | single line with `\n` escapes |
| `FIREBASE_CLIENT_EMAIL` | ✅ | |
| `FIREBASE_CLIENT_ID` | ✅ | |
| `WHISH_API_URL` | ✅ | valid URL |
| `WHISH_CHANNEL` | ✅ | |
| `WHISH_SECRET` | ✅ | |
| `WHISH_WEBSITE_URL` | ✅ | valid URL |
| `PAYMENT_CURRENCY` | has default | `USD` (default) |

**Frontend** (`my-app/.env`):

| Variable | Required | Notes |
|----------|:--------:|-------|
| `VITE_API_URL` | ✅ | backend API base (trailing slash trimmed) |
| `VITE_FIREBASE_API_KEY` | ✅ | public client id — not a secret |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | sitter CVs / KYC live here |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | |
| `VITE_FIREBASE_APP_ID` | ✅ | |
| `VITE_FIREBASE_MEASUREMENT_ID` | optional | analytics only |
| `VITE_GOOGLE_MAPS_API_KEY` | optional* | *needed for the booking map (R1 step 4)* |

### Docker Compose

Docker uses the same split-env model as the apps instead of a duplicated root `.env`:

- `backend/.env.docker` for the backend container and local Postgres container.
- `my-app/.env` for the Vite dev server and production frontend build.

Create the Docker backend env file:

```bash
cp backend/.env.docker.example backend/.env.docker
```

Fill in the same backend secrets as `backend/.env`. Keep `DB_HOST=postgres` and
`DB_PORT=5432` in `backend/.env.docker` because the backend container reaches PostgreSQL
through the Compose service name. If host port `5432` is already taken, change
`POSTGRES_HOST_PORT` instead. Keep `NODE_ENV=development` for the local Compose database;
the backend requires PostgreSQL SSL when `NODE_ENV=production`.

Run the full dev stack:

```bash
docker compose \
  --env-file backend/.env.docker \
  --env-file my-app/.env \
  --profile dev \
  up --build
```

- API: `http://localhost:5000`
- API health: `http://localhost:5000/health`
- Frontend: `http://localhost:5173`
- PostgreSQL data lives in the `careconnect_postgres_data` Docker volume.

Run containerized checks:

```bash
docker compose \
  --env-file backend/.env.docker \
  --profile test \
  run --rm backend-check

docker compose \
  --env-file backend/.env.docker \
  --env-file my-app/.env \
  --profile test \
  run --rm frontend-check
```

Run the production-like local stack:

```bash
docker compose \
  --env-file backend/.env.docker \
  --env-file my-app/.env \
  --profile prod \
  up --build
```

- API: `http://localhost:5000`
- Frontend: `http://localhost:8080`

Stop and remove containers:

```bash
docker compose --profile dev down
docker compose --profile prod down
```

Reset the local Docker database:

```bash
docker compose --profile dev down -v
```

---

## Step 0 — Green baseline (run before manual QA)

Confirms the code passes build / lint / unit-tests, so manual QA only has to chase *runtime*
wiring issues (the exact gap R1 closes). Safe to run with no live infra.

```bash
cd backend && npm run build && npm test       # tsc + vitest   (no lint script on backend)
cd my-app   && npm run build && npm run lint && npm run test   # tsc -b + vite build + eslint + vitest
```

> The R1 refactor added 12 unit tests for the extracted `EntitySection`
> (`my-app/src/components/booking/EntitySection.test.tsx`). They render the component in
> isolation with mocked props, so they do **not** exercise the whole modal end-to-end — that
> is what R1 below covers.

---

## R1 — Manual QA of the booking flow

**Why it's still manual.** The full flow depends on three things that can't run in jsdom/CI:
Firebase auth (`onAuthStateChanged` → `getProfile` → `loadCustomerData`, `BookingModal.tsx:~167`),
the live Google Maps JS SDK (`useLocationMap.ts` calls `new google.maps.Map`, `Marker`,
`places.Autocomplete`, `Geocoder` — `google` only exists when the real script loads with a valid
key), and real network calls to `bookingService.createBooking` / `customerService.addPet|addChild` /
`locationService`. A wiring mistake (a prop threaded wrong, an effect that doesn't fire, the map
not mounting into the moved `mapRef`) would pass build + lint + unit tests but break at runtime.

**Do this**, logged in as a **customer**:

1. Open a sitter card → click **Book** → the **customer booking form** opens (not the
   "sign-in" variant shown when logged out, nor the "sitter" warning variant — all three
   branches live in `my-app/src/components/BookingModal.tsx`).
2. Select an existing child/pet — the checkbox toggles and the check icon appears
   (`my-app/src/components/booking/EntitySection.tsx`).
3. **Add a new child & a new pet** via "Add a Child/Pet" → fill the form → Save. After the
   reload, the **just-added entity must come back pre-checked**. This is the specific fix to
   confirm (`BookingModal.tsx:291-296`): the new id is read from `response.data?.id` (not
   `response.id`) and pushed into `selectedEntityIds`.
4. **Add a location**: the map renders, your marker is draggable, the search box autocompletes
   Lebanese addresses (`componentRestrictions: { country: 'lb' }`), and picking a place
   back-fills street / area / city. Requires `VITE_GOOGLE_MAPS_API_KEY`.
5. Pick date/time → **Submit** → success message, booking created. Verify it appears in
   **My Bookings** and as a row in the `bookings` table.

**Watch for:** map not appearing (Maps key / referrer issue), the add-entity form not
auto-selecting the new row, or submit failing validation that used to pass.

---

## R6 — Verify `init.sql` against a real `pg_dump`

**Why.** `backend/migrations/init.sql` was assembled from the app's SQL plus the prior schema
deltas and then consolidated. The column *names* are reliable (every one is exercised by the
app), but the file is still a guess on: exact types, `NOT NULL` / `DEFAULT` constraints, FK
`ON DELETE` actions, and any column that exists in the live DB but is never touched by the app.
The live `pg_dump` is the truth.

**Verify** (on the box that has the DB):

```bash
# 1. dump the real schema (truth)
pg_dump --schema-only --no-owner --no-privileges -h <host> -U <user> <dbname> > live_schema.sql

# 2. rebuild the schema from init.sql on a scratch DB
createdb cc_scratch
psql cc_scratch -f backend/migrations/init.sql
pg_dump --schema-only --no-owner --no-privileges cc_scratch > rebuilt_schema.sql

# 3. compare (normalize ordering first — pg_dump order isn't stable)
diff <(sort live_schema.sql) <(sort rebuilt_schema.sql)
```

Reconcile any mismatch by editing `backend/migrations/init.sql`. The most likely deltas are
types/defaults and FK actions. The `booking_from` / `booking_to` type question is already
settled: both are `TIMESTAMPTZ` (see O1).

---

## O1 — Ensure the double-booking constraint exists on the live DB

**What it is.** `init.sql:129-132` defines a Postgres-level guard so two overlapping bookings
for the same sitter physically cannot be inserted — the last line of defence behind the
app-level `FOR UPDATE` + overlap check in `backend/src/routes/bookings/index.ts:153-171`
(which also catches the DB's `23P01 exclusion_violation` as a concurrency fallback at
`:268-278`):

```sql
CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
  sitter_id WITH =,
  tstzrange(booking_from, booking_to, '[)') WITH &&
) WHERE (status <> 'CANCELED')
```

**This step is about the *live* database** — make sure it actually has the constraint, the
extension, and the right column types.

**Pre-flight checks** (run against the live DB):

```sql
-- 1. booking_from / booking_to must be "timestamp with time zone" (tstzrange needs it)
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'bookings' AND column_name IN ('booking_from', 'booking_to');

-- 2. the constraint must exist
SELECT conname FROM pg_constraint
 WHERE conrelid = 'bookings'::regclass AND conname = 'bookings_no_overlap';

-- 3. btree_gist extension must be installed
SELECT extname FROM pg_extension WHERE extname = 'btree_gist';
```

**Two paths to apply:**

- **Fresh-DB-first (pre-launch convention).** If the DB is disposable, recreate it and apply
  `init.sql` — the extension, types, and constraint all install automatically:
  ```bash
  dropdb <dbname> && createdb <dbname>
  psql <dbname> -f backend/migrations/init.sql
  ```
- **Preserve-and-ALTER (existing data you want to keep).** Add the extension, resolve any
  pre-existing overlaps, then add the constraint. Find overlaps first:
  ```sql
  SELECT a.id, b.id FROM bookings a JOIN bookings b
    ON a.sitter_id = b.sitter_id AND a.id < b.id
   AND a.status <> 'CANCELED' AND b.status <> 'CANCELED'
   AND tstzrange(a.booking_from, a.booking_to) && tstzrange(b.booking_from, b.booking_to);
  ```
  Resolve those rows, then:
  ```sql
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
      sitter_id WITH =,
      tstzrange(booking_from, booking_to, '[)') WITH &&
    ) WHERE (status <> 'CANCELED');
  ```

> If `booking_from`/`booking_to` are `timestamp without time zone` on the live DB (they
> shouldn't be — `init.sql` uses `TIMESTAMPTZ`), `tstzrange` won't work; use `tsrange` instead.

---

## O2 — Restrict the Google Maps key in GCP

**Why.** A client-side Maps key ships in the browser bundle (the map renders in the user's
browser), so it is inherently public — and the current unrestricted key is in **git history**.
"Public" doesn't mean "safe to leave open": an unrestricted key can be lifted and used on
someone else's site, running up your billing quota. The protection isn't hiding the key, it's
**scoping** it. (The code is already clean — `my-app/index.html:12` injects it from
`VITE_GOOGLE_MAPS_API_KEY`.)

**How** — Google Cloud Console → APIs & Services → Credentials → that key:

- **Application restriction → HTTP referrers:** allow only your domains
  (`https://yourdomain.com/*`, plus your dev/staging host). The key then only works when called
  from your sites.
- **API restriction:** limit to **Maps JavaScript API** + **Places API** (what
  `useLocationMap.ts` uses) — not every Google API.
- **Rotate it:** issue a new restricted key, swap `VITE_GOOGLE_MAPS_API_KEY`, retire the old
  one — since the old key was committed unrestricted.

---

## O3 — Verify Firebase Storage + Firestore Security Rules

**Why this is the real boundary.** Sitter **CVs and KYC / identity documents** are uploaded to
Firebase Storage. The Firebase web `apiKey` is not a secret — it's a public client identifier.
What actually stops a stranger from reading another sitter's passport scan is the **Security
Rules**, which run server-side on Google's infra. If they're permissive (e.g. `allow read,
write: if true;` — a common dev default), anyone with the public config can list and download
every document.

**There are no rules files in this repo** — so verification happens in the **Firebase console**
(Console → Storage → Rules, and Firestore → Rules). Confirm rules are authenticated and
owner-scoped, e.g. only the authenticated owner can read/write their own path:

```
// storage.rules — illustrative
match /sitters/{uid}/{file=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

**Test it:** while signed in as user A, try to read user B's file — it must be **denied**.
Repeat the review for any Firestore collection holding personal data.

---

## O4 — Populate real `.env`s + staging smoke test

**Why.** Both apps fail fast at startup when required env vars are missing (backend
`process.exit(1)`, frontend throws) — deliberately, with no insecure fallbacks. So before
running anywhere real, the env must be fully populated, and then the whole path validated
against the real Whish sandbox (which no test can do — tests mock Whish).

**1. Populate the envs** — use the full var tables in [§0](#required-environment-variables).

**2. Smoke test end-to-end against the Whish sandbox:**

sign up → log in → create a booking → initiate payment → complete it in Whish's sandbox →
confirm the callback flips the booking to **`CONFIRMED`** and the payment to **`COMPLETED`**.

This is also where you confirm the R4 behavior: the callback **re-verifies payment status
server-side with Whish** (never trusts query params), verifies against the **stored payment
amount**, and the booking-status + payment-status updates commit **atomically**.
