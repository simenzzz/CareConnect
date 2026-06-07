-- 004: Prevent a sitter from being double-booked for overlapping time ranges.
--
-- This is the DB-level guard backing the application-level overlap check in
-- bookings.ts (POST /api/bookings). The app check + per-sitter row lock handles
-- the common case with a friendly 409; this constraint is the last line of
-- defence against any path that inserts a booking directly.
--
-- NOTE before applying:
--   * Requires the `btree_gist` extension (for the `sitter_id WITH =` part).
--   * Assumes `booking_from`/`booking_to` are `timestamptz`. If they are
--     `timestamp without time zone`, replace `tstzrange` with `tsrange`.
--   * Existing overlapping rows will make the ADD CONSTRAINT fail — resolve any
--     overlaps first (the app has not been enforcing this historically).

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Half-open ranges '[)' (lower-inclusive, upper-exclusive) so back-to-back
-- bookings that touch at an endpoint do NOT conflict — matching the strict
-- inequalities in the application-level overlap check.
-- Status spelling 'CANCELED' (single 'L') must match what the API writes.
-- Canonical source: backend/src/constants/bookingStatus.ts (BOOKING_STATUS.CANCELED).
-- Raw SQL cannot import TS, so keep this literal in lockstep with that constant.
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    sitter_id WITH =,
    tstzrange(booking_from, booking_to, '[)') WITH &&
  )
  WHERE (status <> 'CANCELED');
