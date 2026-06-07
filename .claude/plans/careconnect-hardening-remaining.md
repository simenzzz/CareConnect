> ✅ **STATUS 2026-06-08:** R1–R6 below are all DONE and committed on `main`
> (`1b0a302`..`0264681`, not pushed). Backend build clean + 17 tests; frontend
> build + lint (0 errors) + 46 tests. Only the OPS items (O1–O4) and two manual
> verifications remain: R1 booking-flow QA with a live Maps key, and diffing the
> reconstructed `000_init.sql` against a real `pg_dump`. Live status in the
> `careconnect-security-todos` memory.

# CareConnect Hardening — Remaining Work (session handoff)

> Continues `careconnect-hardening.md`. Steps 1–6 are largely **done and committed**
> (`c9aaea1`..`84aa049` on `main`, not pushed). This file lists only what's LEFT, with
> rationale, so a fresh session can resume cleanly. Live status also in Claude's
> auto-memory `careconnect-security-todos`.

## State at handoff

- **Backend:** `npm run build` clean, `npm test` = 14 passing (4 files).
- **Frontend:** `npm run build` clean, `npm run lint` = **0 errors** (2 pre-existing
  `react-hooks/exhaustive-deps` warnings, non-failing), `npm test` = 34 passing (4 files).
- All god-files split except **BookingModal** (still 1184 lines).
- Every security-touching change was reviewed (code-reviewer + security-reviewer) and
  CRITICAL/HIGH addressed.

Done so far (commit refs): security holes `e4ad75c`, data integrity `beeea88`, H7/H8
`2332264`, safe debt `7ac754c`, test net `b93f70e`, auth.ts split `47a2e25`, bookings.ts
split `af7f6cf`, signup splits `62395d8`/`395bfbc`, BookingModal partial `6a7bdb9`,
lint-green `84aa049`.

---

## REMAINING — code

### R1. Finish the BookingModal split (M1) — **highest remaining effort, do with QA**
`my-app/src/components/BookingModal.tsx` is **1184 lines** (>800 target). `AddLocationForm`
was already extracted to `components/booking/AddLocationForm.tsx`. What's left:
- Extract the **entity-selection block** (the `{!showAddForm ? (...select list...) : (...add
  child/pet form...)}` region, ~lines 645–961 pre-split) into `components/booking/EntitySection.tsx`
  (or split into `EntitySelect` + `EntityForm`).
- Optionally move the Google Maps helpers (`initializeLocationMap`, `createLocationMap`,
  `reverseGeocodeLocation`) into a `useLocationMap` hook or `booking/locationMap.ts`.

**Rationale / caution:** This is the app's **core revenue flow and has ZERO automated
tests**, and the form state (`entityFormData`) is intentionally `any` (shape varies by
`sitterType`), so the props are heavy and tsc can't catch a mis-wire as cleanly as the
other splits. Why it was deferred: doing it blind risks a runtime regression in booking
creation that build+lint won't surface. **Do this with a running app + Google Maps key and
manually QA: open modal → select/add child & pet → add location (map + search) → submit a
booking.** Consider writing a couple of RTL tests for the modal first (mock services) to
create a safety net, mirroring the Phase-3 pattern.

### R2. Backend logging cleanup (M4) — introduce a real logger
~90 `console.*` remain in `backend/src` (heaviest: `routes/auth/*`, `server.ts`,
`routes/bookings/*`). Backend has **no eslint gate**, so these don't fail CI, but the
project rule (`.claude/CLAUDE.md` §7) says "no stray `console.*`; use a real logger".
- Add `backend/src/utils/logger.ts` (tiny leveled wrapper: `debug/info/warn/error`,
  silence `debug/info` when `NODE_ENV==='production'`; or adopt `pino`).
- Replace committed `console.*` (keep genuine error logging, drop debug noise).
- Frontend has residual debug `console.log`s too (e.g. `confirmChild/confirmPet` in
  `CustomerSignupPage`, `handleFileChange` in `SignupPage`); route through a frontend
  `utils/logger.ts` or strip.

**Rationale:** observability + the no-stray-console convention; low risk (logging only).

### R3. Shared `BookingStatus` constant
Status string literals (`'UPCOMING'`, `'CONFIRMED'`, `'COMPLETED'`, `'CANCELED'`) are
scattered across `routes/bookings/*`, the update handler's `validStatuses`, and
`migrations/004`. A spelling drift already caused a CRITICAL bug this effort
(`CANCELED` vs `CANCELLED`). Extract `backend/src/constants/bookingStatus.ts`
(`export const BOOKING_STATUS = {...} as const`) and reference everywhere, including the
zod schema (`status: z.enum(...)` instead of `z.string().max(50)`).

**Rationale:** single source of truth; prevents the exact class of bug that bit us.

### R4. Real-money correctness follow-ups (from the Step-2/3 reviews)
- **`PUT /api/bookings/:id` lets the owning customer mutate `price_usd`/`discount`.**
  Because the Whish callback re-verifies the charged amount *against the (mutable) booking*,
  a customer could lower the price between agreement and payment and still pass the check.
  → Forbid `price_usd`/`discount` edits by the customer once created / once a payment row
  exists. File: `backend/src/routes/bookings/index.ts` (PUT handler).
- **Make the Whish callback's two UPDATEs transactional.** `routes/payments.ts` updates
  `payments` then `bookings` as separate statements; wrap in `withTransaction` (the helper
  exists in `config/database.ts`). Folds together with the H4 pattern.

**Rationale:** both touch real payments; flagged MEDIUM, pre-existing, not yet fixed.

### R5. Optional: full backend repository adoption
`repositories/userRepository.ts` exists and is used by `routes/auth/helpers.ts`, but
`routes/bookings/*` still inlines its own `SELECT id, user_type FROM users...` /
`SELECT id FROM customers...` lookups (7×). Wire them onto the repository to finish the
M2 dedup. **Rationale:** consistency / DRY; low value, low risk — optional.

---

## REMAINING — migrations / data

### R6. Baseline migration `000_init.sql`
`backend/migrations/` holds deltas (001–004) but there's **no baseline** of the original
ad-hoc schema (`users`, `customers`, `sitters`, `children`, `pets`, `user_locations`,
`bookings`, junction tables, `sitter_skills`). Reconstruct one from the running DB
(`pg_dump --schema-only`) so a fresh environment is reproducible. **Rationale:** without it,
the migrations folder can't stand up a new DB; needed for staging/CI.

---

## REMAINING — OPS (not code; do before launch)

### O1. Apply migration 004 (double-booking exclusion constraint)
`backend/migrations/004_booking_overlap_constraint.sql`. **Before applying:** (a) confirm
`bookings.booking_from`/`booking_to` are `timestamptz` — if they're `timestamp` without tz,
change `tstzrange`→`tsrange` in the file; (b) requires the `btree_gist` extension;
(c) resolve any pre-existing overlapping rows first or `ADD CONSTRAINT` fails. Until applied,
the per-sitter `FOR UPDATE` lock in the create handler is the only guard.

### O2. Restrict the Google Maps API key in Google Cloud Console
Key is shipped in the bundle (unavoidable for a client Maps key) and is in git history.
Restrict by HTTP referrer to your prod/dev domains + the Maps JS + Places APIs only;
ideally rotate. **Rationale:** billable/abusable otherwise.

### O3. Verify Firebase Storage + Firestore Security Rules
Sitter **CV + identity (KYC) documents** live in Firebase Storage. Confirm rules are locked
down (authenticated, owner-scoped). The web `apiKey` being public is expected — Rules are
the real protection.

### O4. Populate real env + smoke test end-to-end
`backend/.env` (DB_*, FIREBASE_*, WHISH_*, FRONTEND_URL, BACKEND_URL, PAYMENT_CURRENCY) and
`my-app/.env` (`VITE_*`). Smoke: signup → login → create booking → pay against staging Whish.
The app now **fails fast** if any required var is missing.

---

## Suggested order for the next session
1. **R1 BookingModal** first while context is fresh — but write a couple of RTL tests for it
   up front, then extract, then manual QA.
2. **R3 BookingStatus** + **R4 payment follow-ups** (small, high-value, well-tested paths).
3. **R2 logging** + **R5 repository adoption** (mechanical, low-risk).
4. **R6 baseline migration**, then the **O\*** ops items as part of the deploy runbook.

Per workspace rules: run `everything-claude-code:code-reviewer` +
`everything-claude-code:security-reviewer` after each security-touching change (R1, R4),
and keep both apps' build/lint/test green before declaring any item done.
