import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { logger } from '../utils/logger';
import type { Env } from './env';

/**
 * Runtime DB bootstrap: apply the authoritative schema (`migrations/init.sql`) and,
 * when explicitly enabled, the one-shot dev seed (`fixtures/dev_seed.sql`).
 *
 * This exists so a freshly-deployed backend (e.g. on Render, where there is no
 * Docker-Postgres first-boot hook) brings its own database up instead of needing a
 * manual `psql` run. Both steps are idempotent:
 *
 * - Schema: `init.sql` is all `CREATE ... IF NOT EXISTS`, and we only run it when the
 *   `schema_bootstrap` marker table is absent (its presence proves init.sql already ran).
 * - Seed: `dev_seed.sql` is NOT idempotent (it INSERTs with UNIQUE keys), so it runs at
 *   most once — guarded by a `schema_bootstrap` row written in the same transaction.
 *
 * Resolved relative to `process.cwd()`: `/app/...` in the container (the Dockerfile
 * copies `migrations/` and `fixtures/` next to `dist/`) and `backend/...` in local dev.
 */
const SCHEMA_FILE = join(process.cwd(), 'migrations', 'init.sql');
const SEED_FILE = join(process.cwd(), 'fixtures', 'dev_seed.sql');
const SEED_STEP = 'dev_seed';

/** Escape a string for use as a PostgreSQL string literal (single quotes doubled). */
const quoteLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Substitute psql `:var` / `:'var'` variables with safely-quoted literals. `node-pg`
 * does not understand psql variable syntax, so the demo Firebase UIDs — validated to
 * inert tokens in env.ts — are injected here as escaped string literals.
 */
export const substituteUids = (sql: string, vars: Record<string, string>): string => {
  let out = sql;
  for (const [name, value] of Object.entries(vars)) {
    const literal = quoteLiteral(value);
    // Quoted form first (exact token match): :'name'  →  'literal'
    out = out.split(`:'${name}'`).join(literal);
    // Unquoted form (token boundary, not part of a longer identifier): :name  →  'literal'
    out = out.replace(new RegExp(`:${escapeRegExp(name)}(?!\\w)`, 'g'), literal);
  }
  return out;
};

/**
 * Remove the outer `BEGIN;` / `COMMIT;` from dev_seed.sql so the body can be run
 * inside our own transaction (we write the seed marker in the same transaction).
 * Only matches statement-level `BEGIN;`/`COMMIT;` — PL/pgSQL `BEGIN` (no semicolon)
 * inside `DO $$ ... $$` blocks is left untouched.
 */
export const stripTransactionFence = (sql: string): string =>
  sql.replace(/\bBEGIN\s*;/i, '').replace(/\bCOMMIT\s*;/i, '');

/** Seed only runs when explicitly enabled AND outside production. */
export const shouldSeed = (env: Env): boolean =>
  env.ENABLE_DEV_SEED === true && env.NODE_ENV === 'development';

/** Map the psql variable names used in dev_seed.sql to validated env UIDs. */
const seedUidMap = (env: Env): Record<string, string> => ({
  customer_uid: env.DEV_SEED_FIREBASE_UID_CUSTOMER_DEMO,
  sitter_baby_uid: env.DEV_SEED_FIREBASE_UID_SITTER_BABY,
  sitter_pet_uid: env.DEV_SEED_FIREBASE_UID_SITTER_PET,
  sitter_both_uid: env.DEV_SEED_FIREBASE_UID_SITTER_BOTH,
  sitter_unverified_uid: env.DEV_SEED_FIREBASE_UID_SITTER_UNVERIFIED,
});

/** Apply the schema exactly once (idempotent via the marker table). Errors are fatal. */
const applySchema = async (pool: Pool): Promise<void> => {
  const { rows } = await pool.query<{ exists: string | null }>(
    "SELECT to_regclass('public.schema_bootstrap') AS exists",
  );
  if (rows[0]?.exists) {
    logger.info('📦 DB schema already present (schema_bootstrap exists); skipping init.sql.');
    return;
  }

  logger.info('📦 Applying DB schema from migrations/init.sql ...');
  await pool.query(readFileSync(SCHEMA_FILE, 'utf8'));
  logger.info('✅ DB schema applied.');
};

/** Apply the dev seed exactly once (idempotent via the marker row). Throws on failure. */
const applySeed = async (env: Env, pool: Pool): Promise<void> => {
  const { rows } = await pool.query('SELECT 1 FROM schema_bootstrap WHERE step = $1', [SEED_STEP]);
  if (rows.length > 0) {
    logger.info('🌱 Dev seed already applied; skipping.');
    return;
  }

  const seedSql = substituteUids(stripTransactionFence(readFileSync(SEED_FILE, 'utf8')), seedUidMap(env));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(seedSql);
    await client.query('INSERT INTO schema_bootstrap (step) VALUES ($1)', [SEED_STEP]);
    await client.query('COMMIT');
    logger.info('✅ Dev seed applied.');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error('Seed rollback failed:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Apply schema (fatal on failure) then, if enabled, the dev seed (non-fatal — a seed
 * problem must not take the API down; it is convenience data).
 */
export const bootstrapDatabase = async (env: Env, pool: Pool): Promise<void> => {
  await applySchema(pool);

  if (!shouldSeed(env)) {
    logger.info(
      `🌱 Dev seed skipped (ENABLE_DEV_SEED=${env.ENABLE_DEV_SEED}, NODE_ENV=${env.NODE_ENV}).`,
    );
    return;
  }

  try {
    await applySeed(env, pool);
  } catch (error) {
    logger.error('⚠️ Dev seed failed (continuing startup):', error);
  }
};
