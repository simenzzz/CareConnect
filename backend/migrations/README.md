# Database schema

`init.sql` is the single authoritative CareConnect PostgreSQL schema while the
product is pre-launch.

## Convention

- Edit `init.sql` directly when the desired schema changes.
- Do not add numbered migration files during development.
- Re-apply the init script to a fresh disposable database after schema changes.
- Revisit append-only migrations once there is production data to preserve.

## Applying

```bash
psql "$DATABASE_URL" -f migrations/init.sql
```

The script is fresh-database-first. It uses `CREATE TABLE IF NOT EXISTS`, so a
second run should not error, but it will not alter an existing table to add new
columns or constraints. For development, recreate the database and apply
`init.sql` instead of maintaining live-table `ALTER` steps.

## Fixtures are NOT schema

Test/sample data belongs in `../fixtures/` and must never be part of the schema
or any deploy path.
