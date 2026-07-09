import { describe, it, expect } from 'vitest';
import { substituteUids, stripTransactionFence, shouldSeed } from '../src/config/dbBootstrap';
import type { Env } from '../src/config/env';

// A complete, type-checked Env stand-in so shouldSeed tests don't construct the full
// object by hand. Spreads + overrides produce valid Env values for each case.
const baseEnv = {
  NODE_ENV: 'development',
  PORT: 5000,
  FRONTEND_URL: 'http://localhost:5173',
  BACKEND_URL: 'http://localhost:5000',
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'careconnect',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  FIREBASE_PROJECT_ID: 'p',
  FIREBASE_PRIVATE_KEY_ID: 'k',
  FIREBASE_PRIVATE_KEY: 'x',
  FIREBASE_CLIENT_EMAIL: 'e@example.com',
  FIREBASE_CLIENT_ID: '1',
  FIREBASE_STORAGE_BUCKET: 'b',
  WHISH_API_URL: 'https://whish.invalid',
  WHISH_CHANNEL: 'x',
  WHISH_SECRET: 'x',
  WHISH_WEBSITE_URL: 'https://whish.invalid',
  PAYMENT_CURRENCY: 'USD',
  ENABLE_DEV_SEED: false,
  DEV_SEED_FIREBASE_UID_CUSTOMER_DEMO: 'dev-demo-customer',
  DEV_SEED_FIREBASE_UID_SITTER_BABY: 'dev-demo-sitter-baby',
  DEV_SEED_FIREBASE_UID_SITTER_PET: 'dev-demo-sitter-pet',
  DEV_SEED_FIREBASE_UID_SITTER_BOTH: 'dev-demo-sitter-both',
  DEV_SEED_FIREBASE_UID_SITTER_UNVERIFIED: 'dev-demo-sitter-unverified',
} satisfies Env;

describe('substituteUids', () => {
  it('replaces the quoted psql :\'name\' form with a quoted literal', () => {
    expect(substituteUids("VALUES (:'customer_uid')", { customer_uid: 'abc-123' })).toBe(
      "VALUES ('abc-123')",
    );
  });

  it('replaces the unquoted :name form', () => {
    expect(
      substituteUids('WHERE uid = :customer_uid AND active = true', { customer_uid: 'abc-123' }),
    ).toBe("WHERE uid = 'abc-123' AND active = true");
  });

  it('escapes single quotes in the value (defence-in-depth on validated input)', () => {
    expect(substituteUids("VALUES (:'customer_uid')", { customer_uid: "o'reilly" })).toBe(
      "VALUES ('o''reilly')",
    );
  });

  it('replaces all five seed UIDs in a realistic snippet', () => {
    const sql = `('customer.demo@x', :'customer_uid', 'customer'),
  ('sitter.baby@x', :'sitter_baby_uid', 'sitter'),
  ('sitter.pet@x', :'sitter_pet_uid', 'sitter'),
  ('sitter.both@x', :'sitter_both_uid', 'sitter'),
  ('sitter.unv@x', :'sitter_unverified_uid', 'sitter');`;
    const out = substituteUids(sql, {
      customer_uid: 'c',
      sitter_baby_uid: 'b',
      sitter_pet_uid: 'p',
      sitter_both_uid: 't',
      sitter_unverified_uid: 'u',
    });
    expect(out).toBe(`('customer.demo@x', 'c', 'customer'),
  ('sitter.baby@x', 'b', 'sitter'),
  ('sitter.pet@x', 'p', 'sitter'),
  ('sitter.both@x', 't', 'sitter'),
  ('sitter.unv@x', 'u', 'sitter');`);
  });

  it('leaves unrelated SQL untouched', () => {
    expect(substituteUids('SELECT 1', { customer_uid: 'c' })).toBe('SELECT 1');
  });

  it('does not match a longer identifier sharing the prefix', () => {
    // The (?!\w) boundary prevents :customer_uid from matching :customer_uid_suffix.
    expect(substituteUids('x = :customer_uid_suffix', { customer_uid: 'c' })).toBe(
      'x = :customer_uid_suffix',
    );
  });

  it('handles a variable name containing regex metacharacters', () => {
    expect(substituteUids('x = :a.b', { 'a.b': 'v' })).toBe("x = 'v'");
  });
});

describe('stripTransactionFence', () => {
  it('removes the outer BEGIN; and COMMIT;', () => {
    const out = stripTransactionFence('BEGIN;\nSELECT 1;\nCOMMIT;');
    expect(out).not.toMatch(/BEGIN\s*;/i);
    expect(out).not.toMatch(/COMMIT\s*;/i);
    expect(out).toContain('SELECT 1;');
  });

  it('leaves PL/pgSQL BEGIN (no semicolon) inside DO blocks untouched', () => {
    const sql = ['BEGIN;', 'DO $$', 'BEGIN', '  PERFORM 1;', 'END $$;', 'COMMIT;'].join('\n');
    const out = stripTransactionFence(sql);
    expect(out).not.toMatch(/BEGIN\s*;/i); // statement-level BEGIN; removed
    expect(out).not.toMatch(/COMMIT\s*;/i); // COMMIT; removed
    expect(out).toMatch(/BEGIN\s+PERFORM/); // PL/pgSQL BEGIN retained
  });

  it('returns input unchanged when no fence is present', () => {
    expect(stripTransactionFence('SELECT 1;')).toBe('SELECT 1;');
  });
});

describe('shouldSeed', () => {
  it('is true when enabled in development', () => {
    expect(shouldSeed({ ...baseEnv, ENABLE_DEV_SEED: true, NODE_ENV: 'development' })).toBe(true);
  });

  it('is false when disabled', () => {
    expect(shouldSeed({ ...baseEnv, ENABLE_DEV_SEED: false, NODE_ENV: 'development' })).toBe(false);
  });

  it('is false in production even when enabled', () => {
    expect(shouldSeed({ ...baseEnv, ENABLE_DEV_SEED: true, NODE_ENV: 'production' })).toBe(false);
  });

  it('is false in test even when enabled', () => {
    expect(shouldSeed({ ...baseEnv, ENABLE_DEV_SEED: true, NODE_ENV: 'test' })).toBe(false);
  });
});
