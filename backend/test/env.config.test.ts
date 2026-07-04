import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the env schema's Whish credential handling (config/env.ts).
 *
 * Unlike the other suites, this one exercises the REAL schema (it must not mock
 * `config/env`). It pins the single sanctioned fallback exception:
 *   - dev/test: missing WHISH_* vars become dev-only `.invalid` placeholders.
 *   - production: missing WHISH_* vars fail fast (process.exit(1)).
 *   - production: real WHISH_* creds pass through unchanged (no placeholder).
 */

// Neutralize dotenv so a developer's local `.env` can't leak real values into
// these cases — every var under test comes from `process.env` we set here.
vi.mock('dotenv', () => ({ default: { config: () => ({}) } }));

const PLACEHOLDER_URL = 'https://whish.invalid';
const PLACEHOLDER_SECRET = 'dev-only-not-a-real-whish-credential';

const WHISH_KEYS = [
  'WHISH_API_URL',
  'WHISH_CHANNEL',
  'WHISH_SECRET',
  'WHISH_WEBSITE_URL',
] as const;

// Everything required by the schema EXCEPT the Whish vars, so each test isolates
// the Whish branch.
const REQUIRED_BASE: Record<string, string> = {
  FRONTEND_URL: 'https://front.test',
  BACKEND_URL: 'https://back.test',
  DB_HOST: 'localhost',
  DB_NAME: 'careconnect',
  DB_USER: 'careconnect',
  DB_PASSWORD: 'pw',
  FIREBASE_PROJECT_ID: 'pid',
  FIREBASE_PRIVATE_KEY_ID: 'kid',
  FIREBASE_PRIVATE_KEY: 'pk',
  FIREBASE_CLIENT_EMAIL: 'svc@example.com',
  FIREBASE_CLIENT_ID: 'cid',
  FIREBASE_STORAGE_BUCKET: 'careconnect.test',
};

let savedEnv: NodeJS.ProcessEnv;
let exitSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  savedEnv = { ...process.env };
  vi.resetModules(); // defeat the module-level cachedEnv between cases
  // Guard the runner: a stray `loadEnv` failure should reject (assertable),
  // not call the real `process.exit` and kill vitest.
  exitSpy = vi
    .spyOn(process, 'exit')
    .mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.env = savedEnv;
  vi.restoreAllMocks();
});

/** Reset the relevant vars, then apply the base + the case-specific overrides. */
const setEnv = (vars: Record<string, string>) => {
  for (const key of [...WHISH_KEYS, 'NODE_ENV']) {
    delete process.env[key];
  }
  Object.assign(process.env, REQUIRED_BASE, vars);
};

const loadEnvFresh = async () => {
  const mod = await import('../src/config/env');
  return mod.loadEnv();
};

describe('env schema — Whish credential fallback', () => {
  it('substitutes dev-only placeholders when Whish vars are absent in development', async () => {
    setEnv({ NODE_ENV: 'development' });

    const env = await loadEnvFresh();

    expect(env.WHISH_API_URL).toBe(PLACEHOLDER_URL);
    expect(env.WHISH_WEBSITE_URL).toBe(PLACEHOLDER_URL);
    expect(env.WHISH_CHANNEL).toBe(PLACEHOLDER_SECRET);
    expect(env.WHISH_SECRET).toBe(PLACEHOLDER_SECRET);
  });

  it('substitutes placeholders when Whish vars are blank (empty string) in development', async () => {
    // dotenv turns `WHISH_API_URL=` into '' (not undefined); this is the
    // realistic "left blank in .env.docker" path the docs promise works.
    setEnv({
      NODE_ENV: 'development',
      WHISH_API_URL: '',
      WHISH_CHANNEL: '',
      WHISH_SECRET: '',
      WHISH_WEBSITE_URL: '',
    });

    const env = await loadEnvFresh();

    expect(env.WHISH_API_URL).toBe(PLACEHOLDER_URL);
    expect(env.WHISH_WEBSITE_URL).toBe(PLACEHOLDER_URL);
    expect(env.WHISH_CHANNEL).toBe(PLACEHOLDER_SECRET);
    expect(env.WHISH_SECRET).toBe(PLACEHOLDER_SECRET);
  });

  it('fails fast (exit 1) when Whish vars are absent in production', async () => {
    setEnv({ NODE_ENV: 'production' });

    await expect(loadEnvFresh()).rejects.toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);

    const logged = errorSpy.mock.calls.map((args) => args.join(' ')).join('\n');
    for (const key of WHISH_KEYS) {
      expect(logged).toContain(key);
    }
  });

  it('passes real Whish creds through unchanged in production (no placeholder)', async () => {
    setEnv({
      NODE_ENV: 'production',
      WHISH_API_URL: 'https://whish.example/api',
      WHISH_CHANNEL: 'real-channel',
      WHISH_SECRET: 'real-secret',
      WHISH_WEBSITE_URL: 'https://site.example',
    });

    const env = await loadEnvFresh();

    expect(env.WHISH_API_URL).toBe('https://whish.example/api');
    expect(env.WHISH_CHANNEL).toBe('real-channel');
    expect(env.WHISH_SECRET).toBe('real-secret');
    expect(env.WHISH_WEBSITE_URL).toBe('https://site.example');
  });
});
