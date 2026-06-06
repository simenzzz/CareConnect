# CareConnect — Project Guide for Claude

> This file specializes the global rules in `~/.claude/rules/*` and the workspace rules
> in `~/.claude/CLAUDE.md` for this repo. Where this file is silent, the global rules
> apply. Where it conflicts, **this file wins** for CareConnect.

## 1. What this is

CareConnect is a **Lebanon-based, two-sided marketplace** that connects parents
(who have **children and/or pets**) with **vetted sitters** for baby-sitting and
pet-sitting. Parents describe who needs care and their preferences; sitters onboard with
a CV + KYC and, once verified, can be booked. Pricing is in **USD**. Payment is via
**Whish Money** or **cash** (OMT possibly later).

- **Platform scope:** web app now; native mobile (Google Play / App Store) is on the
  roadmap. **Keep the backend API-first** — never put business logic in the web client
  that a future mobile client would need to re-implement.
- Product brief (origin notes): `Pet  baby sitting.txt` at repo root (gitignored; local only).

## 2. Repository layout

### Quick start (local dev)

```bash
# Backend (terminal 1) — needs PostgreSQL running + backend/.env populated
cd backend && npm install && npm run dev      # API on http://localhost:5000  (GET /health to smoke-test)

# Frontend (terminal 2) — needs my-app/.env with VITE_API_URL + VITE_FIREBASE_*
cd my-app && npm install && npm run dev        # Vite dev server (see terminal for URL)
```
> Copy `backend/.env.example` and `my-app/.env.example` to `.env` and fill them in — see §10 for the full var list.

Monorepo with two independently-built apps:

| App | Stack | Key commands |
|-----|-------|--------------|
| `my-app/` (frontend) | React 19, Vite, TypeScript, react-router v7, Firebase web SDK (auth + storage + firestore), Google Maps | `npm run dev`, `npm run build`, `npm run lint` |
| `backend/` (API) | Express 5, TypeScript, PostgreSQL (`pg`), Firebase Admin | `npm run dev` (nodemon, port **5000**), `npm run build` (tsc → `dist/`), `npm start` |

There are **two user types**, `customer` and `sitter`, both rooted in a `users` row keyed
by `firebase_uid`.

## 3. Auth model — the canonical rule

**Firebase is the single source of identity.** The flow:

1. Client authenticates with Firebase (web SDK) and obtains an **ID token**.
2. Client sends it as `Authorization: Bearer <idToken>`.
3. Backend `verifyToken` middleware (`backend/src/routes/auth.ts`) verifies it via
   Firebase Admin (`backend/src/config/firebase.ts`) and resolves the app user from
   `firebase_uid`.

**Authorization rule (do not violate):** never trust a client-supplied
`userId`/`customerId`/`sitterId` for authorization. Always resolve the id from the
verified token and scope queries by it, e.g.
`... WHERE id = $1 AND customer_id = $2`. This pattern is already used throughout
`auth.ts`/`bookings.ts` — follow it.

- `jsonwebtoken` is an unused legacy dependency — **do not build custom JWT on it.**
- Frontend: `my-app/src/services/authService.ts` is the canonical auth service.
  `my-app/src/config/auth.ts` and `my-app/src/config/api.ts` are **dead code** — don't
  extend them; prefer removing them.

## 4. Data model (current PostgreSQL tables)

`users`, `customers`, `sitters`, `children`, `pets`, `user_locations`, `bookings`,
`booking_children` + `booking_pets` (junction tables), `payments`.

- A booking links many children and/or pets via the **junction tables**. The legacy
  `bookings.pet_id` / `bookings.child_id` single columns are **deprecated** — see
  `backend/cleanup-bookings-table.sql`. Use the junction tables.
- **Soft delete** via `is_active = false` (children, pets, locations).
- Sitters are bookable only when `is_active = true AND is_verified = true`.
- Schema today is created ad-hoc; migration SQL lives loosely in `backend/*.sql`.
  Intended direction: an ordered `backend/migrations/` folder (and keep test fixtures
  like `create-test-bookings.sql` out of any deploy path).

## 5. API surface

Base path `/api`, routers mounted in `backend/src/server.ts`:

- `/api/auth` — register, login, profile, and CRUD for children / pets / locations
  (`backend/src/routes/auth.ts`).
- `/api/sitters` — `fetchSitters`, `searchByName` (`backend/src/routes/sitters.ts`).
- `/api/bookings` — list / get / create / update / delete (`backend/src/routes/bookings.ts`).
- `/api/payments` — Whish initiate / callback / get (`backend/src/routes/payments.ts`).

Detailed contracts: **`backend/BOOKINGS_API.md`** and **`backend/PAYMENTS_API.md`**.
Keep those docs in sync when you change the endpoints.

## 6. Payments (Whish Money)

- Currency USD. Methods: `WISHMONEY`, `CASH` (schema also allows `CARD`).
- **The callback must re-verify payment status server-side with Whish** and must never
  trust query params (e.g. `?status=success`) as proof of payment.
- **Amounts are always computed server-side** from the booking (`price_usd`, `discount`)
  — never trust a client-supplied amount.
- **Validate `discount ∈ [0,100]` and `price > 0`** before persisting.
- ⚠️ Known vuln, do **not** ship: a placeholder/test-mode fallback in `payments.ts`
  confirms bookings on a forged callback when Whish creds are missing or the call throws.
  See §11.

## 7. Coding conventions (specializing the global rules)

Follow `~/.claude/rules/coding-style.md` (immutability, many-small-files <800 lines /
target 200–400, comprehensive error handling, validate at boundaries). Project-specific:

- **Config:** all secrets and URLs come from env vars. **No hardcoded `localhost`**, and
  **no insecure fallbacks** like `process.env.X || 'placeholder'` / `|| 'password'`.
  Validate required env vars at startup and **fail fast** if any are missing.
  - Frontend must read config via `import.meta.env.VITE_*` (today it's all hardcoded —
    fix when touched).
- **Validation:** standardize on **`zod`** schemas at every write boundary (signup,
  profile, children, pets, locations, bookings, payments).
- **SQL:** parameterized queries only (`$1, $2, …`) — never string-concatenate input.
  Wrap multi-table writes (e.g. booking + junction inserts) in a transaction
  (`BEGIN/COMMIT/ROLLBACK` — the pattern already exists in `auth.ts` register).
- **Errors:** never return `error.message` / stack traces to clients in production; gate
  detail behind `NODE_ENV === 'development'` and route through the global handler in
  `server.ts`.
- **Logging:** no stray `console.*` in committed code; use a real logger server-side.

## 8. Testing (pragmatic gate — not the global 80% gate yet)

The repo currently has **zero tests**. Until coverage is backfilled:

- **Required:** tests for any new or changed **auth, bookings, or payments** logic
  (these are the security-critical paths). Include a regression test for the forged
  payment-callback case.
- **Required before declaring work done:** `backend` builds (`npm run build`), `my-app`
  builds + lints (`npm run build && npm run lint`), and typecheck is clean.
- No hard 80% coverage gate yet — backfill over time toward the global target.

## 9. Mandatory review (workspace rule)

Per `~/.claude/CLAUDE.md`: after any non-trivial change run
`everything-claude-code:code-reviewer`, and additionally
`everything-claude-code:security-reviewer` whenever the change touches auth, user input,
API endpoints, payments, or sensitive data. Run them in parallel; address every CRITICAL
and HIGH before reporting done.

## 10. Environment & ops

- **Hosting:** self-hosted **VPS**, self-managed PostgreSQL.
- **DB connection** must use SSL in production and require a real password (no default).
- **Required env vars:**
  - Backend: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `NODE_ENV`,
    `PORT`, `FRONTEND_URL`, `BACKEND_URL`, `FIREBASE_PROJECT_ID`,
    `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`,
    `FIREBASE_CLIENT_ID`, `WHISH_API_URL`, `WHISH_CHANNEL`, `WHISH_SECRET`,
    `WHISH_WEBSITE_URL`, `PAYMENT_CURRENCY`.
  - Frontend: `VITE_API_URL`, plus `VITE_FIREBASE_*` for the web config.
- Committed `.env.example` templates (names only, no values) exist for both apps:
  `backend/.env.example`, `my-app/.env.example`.
- **Never commit** `.env` files or Firebase service-account JSON (already in `.gitignore`).

## 11. Security must-knows & do-not-regress list

- **Firebase Security Rules** for Storage + Firestore must be locked down — sitter **CVs
  and identity (KYC) documents** are uploaded there.
- The Firebase **web `apiKey` is a public client identifier, not a secret** — don't treat
  exposing it as a breach. Real protection is the Security Rules + Firebase Auth.
- If a real secret is ever leaked (e.g. a payment/API key), **rotate it** and purge it
  from git history.

**Open hardening items (don't reintroduce / fix before launch):** forgeable Whish
callback (test-mode fallback), DB `password`/`ssl:false` fallbacks, unauthenticated
sitter-PII endpoint (`/api/sitters/fetchSitters`), hardcoded `http://localhost:5000` in
frontend services, missing route guards, no input validation, no rate limiting,
non-transactional booking creation, no double-booking check. Full audit + sequencing:
`~/.claude/plans/careconnect-hardening.md`.
