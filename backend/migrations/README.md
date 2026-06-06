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
`user_locations`, `bookings`, junction tables) was created ad-hoc and is **not**
captured as a `000_init.sql` baseline yet — these files are the known deltas layered
on top of that live state. Reconstructing a clean baseline from the running schema is
a tracked follow-up.

## Fixtures are NOT migrations

Test/sample data lives in `../fixtures/` (e.g. `sample_bookings.sql`) and must never
be applied to production. Keep it out of any automated migration/deploy path.
