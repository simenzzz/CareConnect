# CareConnect Hardening — Execute Remaining Work (R1–R6 + ops runbook)

## Context

Steps 1–6 of the hardening effort are done and committed on `main` (`c9aaea1`..`84aa049`,
not pushed). What's left is captured in `.claude/plans/careconnect-hardening-remaining.md`:
the BookingModal god-file split (R1), backend logging cleanup (R2), a shared BookingStatus
constant (R3), two real-money correctness follow-ups (R4), repository adoption (R5), a
baseline migration (R6), plus ops items (O1–O4) that need infra access.

This plan executes **all code items R1–R6**. User decisions for this run:
- **R1 included** — write RTL safety-net tests first, then extract; manual QA afterward.
- **R4 price lock** — forbid the customer from editing `price_usd`/`discount` once a
  `payments` row exists for the booking; also make the Whish callback's two UPDATEs
  transactional.
- **R2 logger** — tiny custom leveled wrapper (no new dependency).

Baseline state: backend `npm run build` clean, `npm test` 14 passing; frontend
`npm run build` clean, `npm run lint` 0 errors, `npm test` 34 passing. Keep all green
after every item.

**Order (low-risk mechanical first, high-risk R1 last while a safety net exists):**
R3 → R4 → R5 → R2 → R6 → R1. Commit per item (or per logical group).

---

## R3 — Shared `BookingStatus` constant (do first; R4 builds on it)

A spelling drift (`CANCELED` vs `CANCELLED`) already caused a CRITICAL bug. Single source
of truth for booking + payment statuses.

- **New** `backend/src/constants/bookingStatus.ts`:
  - `export const BOOKING_STATUS = { UPCOMING, CONFIRMED, ONGOING, COMPLETED, CANCELED } as const`
    and `export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS]`.
  - `export const PAYMENT_STATUS = { PENDING, COMPLETED, FAILED } as const` (used by
    `payments.ts`).
  - Export a `BOOKING_STATUS_VALUES` array for the zod enum + handler validation.
- Replace literals:
  - `backend/src/routes/bookings/index.ts` — the `validStatuses` array (line ~357) →
    `BOOKING_STATUS_VALUES`; `'CANCELED'`/`'UPCOMING'` literals (lines ~152, 177).
  - `backend/src/validation/booking.schemas.ts` — `status: z.string().trim().max(50)` (line 63)
    → `z.enum(BOOKING_STATUS_VALUES).optional()`. Drop the duplicated `validStatuses`
    check in the handler (zod now enforces it) **or** keep it referencing the shared array.
  - `backend/src/routes/payments.ts` — `'PENDING'`/`'COMPLETED'`/`'FAILED'`/`'CONFIRMED'`
    literals (lines ~91, 105, 159, 263, 271, 282, 308) → constants.
- **Note:** `migrations/004_booking_overlap_constraint.sql` hardcodes `status <> 'CANCELED'`
  in SQL (can't import TS) — leave it, but add a comment cross-referencing the constant so
  the spelling stays pinned.

→ `npm run build` + `npm test` green.

## R4 — Real-money correctness follow-ups (security-critical → review)

**(a) Lock price/discount once payment exists.** In the PUT handler
`backend/src/routes/bookings/index.ts` (~lines 345–353), before applying `price_usd` /
`discount` updates **for a customer**, check whether a `payments` row exists for the booking:

```ts
// when user.user_type === 'customer' and (priceUsd !== undefined || discount !== undefined)
const pay = await query('SELECT 1 FROM payments WHERE booking_id = $1 LIMIT 1', [bookingId]);
if (pay.rows.length > 0) return res.status(403).json({ error: 'Price cannot be changed after payment has started' });
```

Rationale: the Whish callback re-verifies the charged amount **against the (mutable)
booking**, so a customer lowering the price between agreement and payment would still pass.
Sitters retain price control pre-payment. Keep the existing per-field dynamic-update build.

**(b) Make the Whish callback transactional.** In `backend/src/routes/payments.ts`
(~lines 259–272) the `payments` UPDATE then `bookings` UPDATE are separate statements.
Wrap them in the existing `withTransaction` helper (`backend/src/config/database.ts`
lines 49–72) so a confirmed payment can't leave the booking unconfirmed. The failed-payment
UPDATE (~304) is a single statement — fine as-is.

→ `npm run build` + `npm test` green (extend `test/` with a regression: customer PUT
price-change after a payment row exists → 403; callback still confirms idempotently).
**Run `code-reviewer` + `security-reviewer` in parallel** (touches payments). Address
CRITICAL/HIGH before moving on. Update `backend/PAYMENTS_API.md` / `BOOKINGS_API.md` if the
PUT contract note changes.

## R5 — Repository adoption (DRY; low risk)

`backend/src/repositories/userRepository.ts` already exports `getUserByFirebaseUid` and
`getCustomerIdByUserId`. Replace the ~8 inline `SELECT id, user_type FROM users WHERE
firebase_uid = $1` + `SELECT id FROM customers WHERE user_id = $1` repetitions in
`backend/src/routes/bookings/index.ts` (lines ~66/82, 273/287, 460/474) and
`backend/src/routes/bookings/list.ts` (lines ~21/35, 209/222, 396/409, 587/603) with the
repository calls. Preserve every ownership/`user_type` branch and the 404 messages verbatim
— mechanical substitution only. If `getSitterIdByUserId` is needed and missing, add it to
the repository.

→ `npm run build` + `npm test` green.

## R2 — Logging cleanup (tiny custom logger; low risk)

- **New** `backend/src/utils/logger.ts`: leveled wrapper `{ debug, info, warn, error }`
  delegating to `console`, silencing `debug`/`info` when `NODE_ENV === 'production'`
  (read via existing `config/env.ts`). ~30 lines, no dependency.
- **New** `my-app/src/utils/logger.ts`: same shape, gate on `import.meta.env.PROD`.
- Replace committed `console.*` in `backend/src` (~58 across `server.ts` 12,
  `routes/bookings/*`, `routes/auth/*`, `payments.ts`, `config/*`): route genuine errors
  through `logger.error`, drop pure-debug noise. **Do not** silence the env-validation
  fail-fast messages in `config/env.ts` / startup (those must always print).
- Frontend residual debug logs: `CustomerSignupPage.tsx` `confirmChild` (~225) /
  `confirmPet` (~262), `SignupPage.tsx` `handleFileChange` (~205/222) — strip or route
  through the frontend logger.

→ `npm run build` + `npm test` (backend) and `npm run build` + `npm run lint` + `npm test`
(frontend) green.

## R6 — Baseline migration `000_init.sql`

`backend/migrations/` has deltas 001–004 but no baseline, so the folder can't stand up a
fresh DB. Reconstruct one:

- Generate `backend/migrations/000_init.sql` capturing the original ad-hoc schema (`users`,
  `customers`, `sitters`, `children`, `pets`, `user_locations`, `bookings`,
  `booking_children`, `booking_pets`, `sitter_skills`) **as it existed before 001** — i.e.
  the pre-payments, pre-`002`-fields baseline, so 001→004 still apply cleanly on top.
  Prefer `pg_dump --schema-only --no-owner --no-privileges` from the running DB, then
  hand-trim the objects that migrations 001–004 create/alter (payments table, the 002
  columns, the 004 constraint) so there's no duplication.
- Update `backend/migrations/README.md` to note the baseline now exists and the apply order.

→ This is SQL/doc only; no app build impact. **Requires the running DB** — if Postgres
isn't reachable in this session, produce the file from the known schema in
`.claude/CLAUDE.md` §4 + the existing `backend/*.sql` and flag it for verification against a
live `pg_dump`.

## R1 — Finish the BookingModal split (highest risk; do last, with a safety net)

`my-app/src/components/BookingModal.tsx` is **1184 lines** (>800 target).
`booking/AddLocationForm.tsx` (226 lines) is already extracted. No tests reference the modal.

**Step 1 — RTL safety net first.** Add `my-app/src/components/booking/__tests__/` (mirror the
existing vitest/RTL setup used by `AuthContext.test.tsx` etc). Mock `customerService`,
`bookingService`, `locationService` and Google Maps. Cover: open modal → entity list renders
for `sitterType` pet vs baby; toggling selection; opening the add-entity form; save calls the
right service; submit calls `bookingService.create` with the selected ids. This is the net the
extraction leans on.

**Step 2 — extract `booking/EntitySection.tsx`** (~350 lines) from the entity-selection block
(BookingModal.tsx ~lines 704–1020): the checkbox select list + the conditional add-child /
add-pet form + `handleAddEntityClick` / `handleSaveEntity`. Props in: `sitterType`,
`availableItems`, `selectedEntityIds`, `showAddForm`, `entityFormData`, `isSavingEntity`,
`isLoadingData`, and the handlers/setters; calls `customerService.addPet`/`addChild` and the
parent's data-reload. **Improve typing:** replace the `entityFormData: any` (line 98) with a
discriminated union `{ kind: 'pet'; ... } | { kind: 'child'; ... }` scoped to the new
component (eliminates the eslint-disable on line 97).

**Step 3 — optional** extract the Google Maps helpers (`initializeLocationMap` ~234–269,
`createLocationMap` ~271–374, `reverseGeocodeLocation` ~376–407) into a `booking/useLocationMap.ts`
hook or `booking/locationMap.ts`, if BookingModal is still >800 lines after Step 2. (Note
`AddLocationForm` already has its own map logic — check for dedup opportunity.)

→ After each extraction: `npm run build` + `npm run lint` + `npm test` green. **Run
`code-reviewer` + `security-reviewer` in parallel** (core revenue flow). Then **manual QA with
a running app + Google Maps key**: open modal → select/add child & pet → add location
(map + search) → submit a booking. Commit per extraction.

---

## Ops runbook (O1–O4) — cannot run here; documented for deploy

- **O1** Apply `migrations/004_booking_overlap_constraint.sql`: confirm
  `bookings.booking_from/booking_to` are `timestamptz` (else swap `tstzrange`→`tsrange`);
  enable `btree_gist`; resolve pre-existing overlaps first.
- **O2** Restrict the Google Maps key in Google Cloud Console (HTTP-referrer to prod/dev
  domains; Maps JS + Places only); ideally rotate.
- **O3** Verify Firebase Storage + Firestore Security Rules are owner-scoped/locked (CV + KYC).
- **O4** Populate real `backend/.env` + `my-app/.env`; smoke test signup → login → booking →
  pay against staging Whish.

---

## Verification (end-to-end)

- **Per item:** backend `cd backend && npm run build && npm test`; frontend
  `cd my-app && npm run build && npm run lint && npm test` — all green before commit.
- **R3:** grep `backend/src` shows no remaining raw status string literals outside the
  constants module (except migration SQL); zod rejects an unknown `status`.
- **R4:** new test — customer PUT changing `price_usd` after a `payments` row exists → 403;
  callback confirms a PENDING payment idempotently and both UPDATEs commit together (force a
  mid-transaction throw in a test → neither row changes).
- **R2:** no stray `console.*` in committed `backend/src` / frontend signup pages; env
  fail-fast messages still print; debug logs silent under production env.
- **R5:** all booking-route user/customer lookups go through `userRepository`; ownership
  scoping and 404 messages unchanged (tests still pass).
- **R6:** on a scratch DB, `000_init.sql` then `001`→`004` apply cleanly with no
  duplicate-object errors.
- **R1:** new RTL tests pass; BookingModal < 800 lines; `entityFormData` no longer `any`;
  manual QA of the full booking flow succeeds.
- **Reviews:** `code-reviewer` + `security-reviewer` after R4 and after the R1 extraction;
  every CRITICAL/HIGH addressed before declaring done.
- Update `careconnect-hardening-remaining.md` + the `careconnect-security-todos` memory as
  items close.
