# CareConnect Hardening — Steps 4–6 (Deployable + Safety Net + Debt Paydown)

> Continues `.claude/plans/careconnect-hardening.md`. Steps 1–3 are DONE and committed
> (`e4ad75c` security holes, `beeea88` data integrity). This plan executes Step 4 (H7,
> H8), Step 5 (test safety net), and Step 6 (M1–M4, M6 — **full, including god-file
> splitting**). User decisions: include M1 god-file splits; route guards **enforce role**.

## Context

After Steps 1–3 the backend is secure and data-safe, but the app is **not yet deployable
or maintainable**:

- **Not deployable (H7):** the frontend hardcodes `http://localhost:5000/api` in 6 service
  files, hardcodes the Firebase web config in `config/firebase.ts`, and ships a hardcoded
  (billable) Google Maps key in `index.html`. Nothing reads `import.meta.env.VITE_*` despite
  `.env.example` defining every var. There is no shared API client — all 22 fetch calls
  duplicate the same token-attach + error-handling boilerplate. Dead `config/api.ts` +
  `config/auth.ts` are never imported.
- **No access control in the UI (H8):** routes `/user-portal` and `/sitter-portal` have no
  guard; each page does its own ad-hoc `onAuthStateChanged` redirect, none check user
  **type** (a sitter can load the customer portal), and both login pages navigate to `/`
  instead of the right portal.
- **No safety net (Step 5):** only payments + bookings have tests; auth/IDOR paths and the
  whole frontend are untested — unsafe ground for the refactors below.
- **Maintainability debt (Step 6):** five god-files (1000–1400 lines), duplicated
  validators + Lebanon geo data, dead code, ~233 `console.*` / ~49 `any`, no error
  boundary, and a `LoginPage` password toggle that mutates the DOM instead of React state.

**Intended outcome:** the frontend reads all config from `VITE_*`; one shared API client;
role-enforcing route guards behind a single auth context; a real test safety net (backend
auth/IDOR + frontend unit/component); the god-files split into focused modules; and the
debt (dead code, logging, `any`, error boundary) paid down — all builds green and reviewed.

## Decisions (confirmed)

- **Step 6 scope:** FULL, including M1 god-file splitting of all five files.
- **Route guards (H8):** enforce role. `<ProtectedRoute requiredRole>` — unauth users go to
  the matching login; logged-in users on the wrong portal are redirected to their own.
- **Backend `userType` is already returned** by `/api/auth/login` and `/api/auth/profile`
  (`auth.ts`), so the auth context can resolve customer-vs-sitter from the profile fetch.
- **Logging (M4):** introduce a tiny leveled logger module per app (no heavy dep); strip
  noisy debug `console.*`, route real errors through it. Do this LAST (after splits churn
  those lines).
- **Local dev:** create `my-app/.env` (gitignored) from `.env.example` with the current
  Firebase/Maps/API values (these are public client identifiers, not secrets) so dev keeps
  working after externalizing config.

---

## Phase 1 — Step 4: deployable config + role guards (H7, H8)

**H7 — config + shared API client (frontend):**
- New `my-app/src/config/env.ts`: read+expose `import.meta.env.VITE_*` (API base, all
  `VITE_FIREBASE_*`, `VITE_GOOGLE_MAPS_API_KEY`); throw a clear dev-time error if a required
  one is missing. Single source of truth.
- New `my-app/src/services/apiClient.ts`: `request<T>(endpoint, { method, body, auth })`
  that prepends `env.apiBaseUrl`, attaches the Firebase ID token via `auth.currentUser
  .getIdToken()` (skippable with `auth:false`), sets headers, parses JSON, applies the
  uniform `if (!response.ok) throw new Error(result.error ...)` pattern (the 22 call sites
  all share it today), and maps network failures to a friendly message. Thin `get/post/
  put/del` helpers.
- Migrate all 6 services (`authService`, `bookingService`, `sittersService`,
  `customerService`, `locationService`; `storageService` is Firebase-only) onto `apiClient`;
  delete the per-file `API_BASE_URL` constants and duplicated fetch/token blocks.
- `config/firebase.ts`: build `firebaseConfig` from `env.ts` instead of literals.
- `index.html`: replace the hardcoded Maps key with `%VITE_GOOGLE_MAPS_API_KEY%` (Vite
  substitutes it at build).
- Remove dead `my-app/src/config/api.ts` and `my-app/src/config/auth.ts` (folds in M3).
- Create local `my-app/.env` (gitignored) with current values so dev still runs.

**H8 — auth context + role guards (frontend):**
- New `my-app/src/context/AuthContext.tsx`: `AuthProvider` subscribes ONCE to
  `onAuthStateChanged`, fetches the profile to resolve `userType`, exposes
  `{ user, userType, profile, isLoading, signOut, refresh }` via `useAuth()`.
- New `my-app/src/components/ProtectedRoute.tsx`: while `isLoading` show a spinner; no user
  → redirect to the role's login (`customer`→`/customer-login`, `sitter`→`/login`, else
  `/portal`); `requiredRole` mismatch → redirect to the user's own portal.
- `App.tsx`: wrap routes in `<AuthProvider>`; guard `/user-portal` (`requiredRole="customer"`)
  and `/sitter-portal` (`requiredRole="sitter"`).
- Fix post-login nav: `LoginPage`→`/sitter-portal`, `CustomerLoginPage`→`/user-portal`
  (use the returned `userType`). Refactor `Header`, `PageHeader`, `UserPortalPage`,
  `SitterPortalPage`, `BookingModal` to consume `useAuth()` and drop their own
  `onAuthStateChanged` redirect effects.

→ build + lint; **review** (code-reviewer + security-reviewer — auth/routing); commit.

## Phase 2 — Step 6 safe extractions (M2, M3, M6) — prerequisites for testing

- **M2 validators:** new `my-app/src/utils/validation.ts` exporting `isValidEmail`,
  `isValidLebanesePhone`, `isOver18`, `isValidPassword` (deduped from `SignupPage` /
  `CustomerSignupPage`); import in both. New `my-app/src/data/lebanon.ts` exporting the
  `lebanonAreas` constant (use the superset incl. `Miniyeh`); import in both signup pages.
- **M2 backend helpers:** new `backend/src/repositories/userRepository.ts` (or
  `utils/userLookup.ts`) with `getUserByFirebaseUid`, `getCustomerByUserId`,
  `getSitterByUserId` — replacing the 21+ inline "lookup user → lookup customer → check
  ownership" repetitions in `auth.ts`/`bookings.ts` incrementally (full sweep lands in
  Phase 4 splits).
- **M3:** remove `jsonwebtoken` from `backend/package.json`; drop redundant
  `export { sittersService }` / `export { storageService }` duplicates.
- **M6:** new `my-app/src/components/ErrorBoundary.tsx` wrapping the app in `App.tsx`; fix
  the `LoginPage`/`CustomerLoginPage` password toggle to use React `useState` (mirroring
  `SignupPage`) instead of `document.getElementById(...).type =`.

→ build + lint; commit.

## Phase 3 — Step 5: test safety net (BEFORE the god-file splits)

- **Backend** (extend existing vitest setup): auth tests — `register` (mock
  `withTransaction`/`query`: 201 + goes through a transaction), `login` (returns `userType`;
  wrong `expectedUserType` → error), and **IDOR**: child/pet/location update+delete as user
  A against user B's row → 403/404 (assert queries are scoped by the token-resolved
  customer id). Reuse the mocking pattern from `test/bookings.create.test.ts`.
- **Frontend:** add `vitest` + `@testing-library/react` + `jsdom` (devDeps, `test` script,
  jsdom config). Tests: `utils/validation.ts` (table-driven), `services/apiClient.ts` (base
  URL, token attach, error mapping — mock `fetch` + `auth.currentUser`), `ProtectedRoute`
  (unauth→login, wrong-role→own portal, right-role→renders), `AuthContext` (resolves
  userType from a mocked profile fetch).

→ run backend + frontend test suites green; commit. This is the net the splits lean on.

## Phase 4 — Step 6 M1: split the god-files (highest risk — tests now exist)

Split incrementally, re-running build+lint+tests after each file; **review** the backend
auth/bookings splits (security-critical).

- **Backend `auth.ts` (1393):** split into route modules mounted under `/api/auth` —
  `routes/auth/index.ts` (register/login/profile) + `children.ts` + `pets.ts` +
  `locations.ts`; move `verifyToken`/`AuthenticatedRequest` to `middleware/auth.ts`; route
  all lookups through the Phase-2 `userRepository`. Preserve every ownership check verbatim.
- **Backend `bookings.ts` (1294):** extract a `services/bookingService.ts` (business/query
  logic) and keep the router thin; reuse `userRepository`.
- **Frontend `BookingModal.tsx` (1369):** extract `LocationMap` (Google Maps init/geocode),
  `EntitySelect` (child/pet picker), and `AddLocationForm`; keep the modal as the
  orchestrator.
- **Frontend `CustomerSignupPage.tsx` (1117):** extract `ChildrenSection` + `PetsSection`
  (+ reuse Phase-2 validators/data).
- **Frontend `SignupPage.tsx` (949):** extract `DocumentUploadSection` + `SkillsManager`
  (+ reuse Phase-2 validators/data).

Target <800 lines/file (ideally 200–400). → build + lint + tests; review; commit (can be
several commits — one per file/group).

## Phase 5 — Step 6 M4: logging + types (last, after structure settles)

- New `backend/src/utils/logger.ts` and `my-app/src/utils/logger.ts`: tiny leveled wrapper
  (`debug`/`info`/`warn`/`error`) that silences debug/info in production. Replace committed
  `console.*` (heaviest: `auth.ts` 51, `authService.ts` 24, `CustomerSignupPage` 23) —
  strip pure-debug logs, route real errors through the logger.
- Tighten the worst `any` (services `customerService`/`authService`/`locationService`;
  `payments.ts`/`auth.ts`) to real types where low-risk.

→ build + lint + tests; commit.

---

## Critical files

**New:** `my-app/src/config/env.ts`, `my-app/src/services/apiClient.ts`,
`my-app/src/context/AuthContext.tsx`, `my-app/src/components/ProtectedRoute.tsx`,
`my-app/src/components/ErrorBoundary.tsx`, `my-app/src/utils/validation.ts`,
`my-app/src/data/lebanon.ts`, `my-app/src/utils/logger.ts`,
`backend/src/repositories/userRepository.ts`, `backend/src/services/bookingService.ts`,
`backend/src/middleware/auth.ts`, `backend/src/routes/auth/*` modules,
`backend/src/utils/logger.ts`, plus new test files (backend auth/IDOR; frontend
validation/apiClient/ProtectedRoute/AuthContext) + frontend vitest config.

**Modified (representative):** `my-app/src/App.tsx`, `config/firebase.ts`, `index.html`,
all `my-app/src/services/*`, `pages/LoginPage.tsx`/`CustomerLoginPage.tsx`,
`pages/UserPortalPage.tsx`/`SitterPortalPage.tsx`, `components/Header.tsx`,
`pages/SignupPage.tsx`/`CustomerSignupPage.tsx`, `components/BookingModal.tsx`,
`backend/src/routes/auth.ts`/`bookings.ts`, `backend/package.json`, `my-app/package.json`.

**Removed:** `my-app/src/config/api.ts`, `my-app/src/config/auth.ts`; `jsonwebtoken` dep.

## Verification

- **H7:** `cd my-app && npm run build` with a `.env` pointing `VITE_API_URL` at a non-local
  host → the bundle calls that host (grep the build, or run and observe). No `localhost:5000`
  or hardcoded Firebase/Maps literals remain in `src/`. Maps loads via `%VITE_*%`.
- **H8 (manual):** logged-out → `/user-portal` redirects to `/customer-login`; sitter →
  `/user-portal` redirects to `/sitter-portal`; customer login lands on `/user-portal`,
  sitter login on `/sitter-portal`.
- **Step 5:** `cd backend && npm test` and `cd my-app && npm test` both green; auth IDOR
  test proves user A cannot mutate user B's child/pet/location.
- **M1 regression:** after each split, `npm run build` + `npm run lint` + `npm test` stay
  green; signup (both), booking create, and login flows still work end-to-end.
- **Builds/lint green:** `cd backend && npm run build && npm test`;
  `cd my-app && npm run build && npm run lint && npm test`.
- **Reviews:** code-reviewer + security-reviewer after Phase 1 and the Phase 4 backend
  auth/bookings splits; address every CRITICAL/HIGH before declaring done.
