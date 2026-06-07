# Database migrations

Ordered, append-only SQL migrations for the CareConnect PostgreSQL schema.

## Convention

- One file per change, named `NNN_short_description.sql` (zero-padded, monotonic).
- Apply in ascending numeric order. Never edit a migration that has already been
  applied to an environment — add a new one instead.
- Prefer idempotent / guarded statements (`IF NOT EXISTS`, `IF EXISTS`) where practical.

## Applying

There is no migration runner wired up yet. Until one is added (e.g. `node-pg-migrate`),
apply manually in order against the target database, for example:

```bash
for f in migrations/[0-9]*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

## History note

The original schema (`users`, `customers`, `sitters`, `children`, `pets`,
`user_locations`, `bookings`, junction tables, `sitter_skills`) was created ad-hoc.
`000_init.sql` now captures that pre-001 baseline so a fresh database can be stood up
by applying `000` → `004` in order. It was **reconstructed from the application's SQL
statements + the known deltas**, not yet diffed against a live `pg_dump`, so verify it
against a real `pg_dump --schema-only --no-owner --no-privileges` before relying on it
in CI/staging and reconcile any differences in types/defaults/FK actions.

The baseline intentionally omits the `payments` table (added by 001) and the
`type_of_booking`/`pet_id`/`child_id` booking columns (added by 002; the single-id
columns are dropped again by 003) so the deltas apply on top without conflict.

## Fixtures are NOT migrations

Test/sample data lives in `../fixtures/` (e.g. `sample_bookings.sql`) and must never
be applied to production. Keep it out of any automated migration/deploy path.
