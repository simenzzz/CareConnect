import dotenv from 'dotenv';
import { z } from 'zod';

// Populate process.env from .env at module load. Because this is intended to be
// the first local import in the app, it runs before any other module reads config.
dotenv.config();

/**
 * Centralized, validated environment configuration.
 *
 * All secrets and URLs are read here exactly once. There are deliberately NO
 * insecure fallbacks for production (no `|| 'password'`, no `|| 'localhost'`):
 * if a required variable is missing or malformed the process fails fast at
 * startup instead of booting into an insecure state.
 *
 * The SINGLE, deliberate exception is the four Whish payment credentials. When
 * `NODE_ENV !== 'production'` they fall back to obviously-fake placeholders (see
 * the `superRefine`/`transform` below) so a developer can boot the stack without
 * a Whish merchant account. This is safe because the placeholders point at a
 * reserved `.invalid` host that never resolves: any real payment call fails
 * loudly, and a booking is only ever confirmed on a genuine Whish `success`
 * (see `routes/payments.ts`), so a placeholder can never fabricate a payment.
 * In production those four vars are hard-required and still fail fast.
 */

const nonEmpty = (label: string) =>
  z.string({ message: `${label} is required` }).trim().min(1, `${label} is required`);

// Treat a blank assignment (`KEY=` → `''` from dotenv) the same as fully absent,
// then make the field optional. Needed for the Whish vars so the documented
// "leave them blank in dev" workflow yields `undefined` (→ placeholder) instead
// of an empty string that fails the URL/non-empty validators.
const optionalBlank = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

// Dev-only stand-ins for Whish credentials. The `.invalid` TLD is reserved
// (RFC 6761) and never resolves, so an accidental payment call in dev fails fast
// instead of silently "succeeding". NEVER substituted when NODE_ENV=production.
const DEV_WHISH_PLACEHOLDER_URL = 'https://whish.invalid';
const DEV_WHISH_PLACEHOLDER_SECRET = 'dev-only-not-a-real-whish-credential';

// The Whish vars made optional above, with the production-required guard.
const WHISH_REQUIRED_VARS = [
  'WHISH_API_URL',
  'WHISH_CHANNEL',
  'WHISH_SECRET',
  'WHISH_WEBSITE_URL',
] as const;

// Dev-seed Firebase UIDs are substituted verbatim into dev_seed.sql by the
// runtime bootstrap, so they must be inert tokens only — no quotes, semicolons,
// or other SQL metacharacters. Validation here is defence-in-depth on top of the
// literal escaping in dbBootstrap.ts.
const DEV_SEED_UID = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,128}$/, 'must be a simple UID token (letters, digits, "_" or "-")');

const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // URLs (used for CORS, payment callbacks/redirects)
  FRONTEND_URL: z.url({ message: 'FRONTEND_URL must be a valid URL' }),
  BACKEND_URL: z.url({ message: 'BACKEND_URL must be a valid URL' }),

  // PostgreSQL
  DB_HOST: nonEmpty('DB_HOST'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: nonEmpty('DB_NAME'),
  DB_USER: nonEmpty('DB_USER'),
  DB_PASSWORD: nonEmpty('DB_PASSWORD'),
  // PostgreSQL TLS mode. Defaults preserve prior behavior (strict certificate
  // verification in production, plaintext elsewhere); override for hosts whose
  // certificate is not in Node's CA bundle (e.g. Render Postgres → `require`) or
  // that do not support TLS at all (`disable`). See `config/database.ts`.
  DB_SSL: z.enum(['verify', 'require', 'disable']).optional(),

  // Firebase Admin (service account)
  FIREBASE_PROJECT_ID: nonEmpty('FIREBASE_PROJECT_ID'),
  FIREBASE_PRIVATE_KEY_ID: nonEmpty('FIREBASE_PRIVATE_KEY_ID'),
  FIREBASE_PRIVATE_KEY: nonEmpty('FIREBASE_PRIVATE_KEY'),
  FIREBASE_CLIENT_EMAIL: nonEmpty('FIREBASE_CLIENT_EMAIL'),
  FIREBASE_CLIENT_ID: nonEmpty('FIREBASE_CLIENT_ID'),
  FIREBASE_STORAGE_BUCKET: nonEmpty('FIREBASE_STORAGE_BUCKET'),

  // Whish Money payments.
  // Optional at the schema level (blank or absent → undefined) so dev can boot
  // without a merchant account; the `superRefine` below makes them hard-required
  // in production, and the `transform` substitutes dev-only placeholders when
  // they are absent outside production. A non-blank but malformed value (e.g. a
  // bad URL) is still rejected.
  WHISH_API_URL: optionalBlank(z.url({ message: 'WHISH_API_URL must be a valid URL' })),
  WHISH_CHANNEL: optionalBlank(nonEmpty('WHISH_CHANNEL')),
  WHISH_SECRET: optionalBlank(nonEmpty('WHISH_SECRET')),
  WHISH_WEBSITE_URL: optionalBlank(z.url({ message: 'WHISH_WEBSITE_URL must be a valid URL' })),
  PAYMENT_CURRENCY: z.string().trim().min(1).default('USD'),

  // Dev seed (see src/config/dbBootstrap.ts). `ENABLE_DEV_SEED` gates the one-shot
  // bootstrap seed; the UID vars are the Firebase identities of the demo accounts.
  // They default to non-loginable placeholders so /sitters shows demo data with no
  // extra configuration — override with real Firebase UIDs to log in as them.
  ENABLE_DEV_SEED: z
    .union([z.boolean(), z.string()])
    .default('false')
    .transform((v) => v === true || v === 'true'),
  DEV_SEED_FIREBASE_UID_CUSTOMER_DEMO: DEV_SEED_UID.default('dev-demo-customer'),
  DEV_SEED_FIREBASE_UID_SITTER_BABY: DEV_SEED_UID.default('dev-demo-sitter-baby'),
  DEV_SEED_FIREBASE_UID_SITTER_PET: DEV_SEED_UID.default('dev-demo-sitter-pet'),
  DEV_SEED_FIREBASE_UID_SITTER_BOTH: DEV_SEED_UID.default('dev-demo-sitter-both'),
  DEV_SEED_FIREBASE_UID_SITTER_UNVERIFIED: DEV_SEED_UID.default('dev-demo-sitter-unverified'),
})
  .superRefine((env, ctx) => {
    // In production the Whish credentials are mandatory — fail fast, exactly as
    // every other required secret does. (Outside production the transform fills
    // placeholders instead.)
    if (env.NODE_ENV === 'production') {
      for (const key of WHISH_REQUIRED_VARS) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required in production`,
          });
        }
      }
    }
  })
  .transform((env) => ({
    ...env,
    // Coalesce to dev-only placeholders. In production a missing var already
    // added a refinement issue, so `safeParse` fails and `loadEnv` discards this
    // transformed value before it is ever used (Zod still runs the transform, but
    // its output is thrown away on a failed parse) — the `??` is effectively a
    // no-op there. The payoff: the inferred `Env` type keeps all four Whish vars
    // as `string` (not `string | undefined`), so payment code needs no change.
    WHISH_API_URL: env.WHISH_API_URL ?? DEV_WHISH_PLACEHOLDER_URL,
    WHISH_CHANNEL: env.WHISH_CHANNEL ?? DEV_WHISH_PLACEHOLDER_SECRET,
    WHISH_SECRET: env.WHISH_SECRET ?? DEV_WHISH_PLACEHOLDER_SECRET,
    WHISH_WEBSITE_URL: env.WHISH_WEBSITE_URL ?? DEV_WHISH_PLACEHOLDER_URL,
  }));

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Parse and validate `process.env`. On failure, print every problem and exit.
 * Call this once at startup (in `server.ts`) AFTER `dotenv.config()`.
 */
export const loadEnv = (): Env => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    console.error(
      '❌ Invalid environment configuration. Fix the following and restart:\n' + issues,
    );
    process.exit(1);
  }

  cachedEnv = Object.freeze(parsed.data);
  return cachedEnv;
};

/**
 * Accessor for already-loaded config. Throws if `loadEnv()` has not run yet,
 * which guarantees no module reads config before it has been validated.
 */
export const getEnv = (): Env => {
  if (!cachedEnv) {
    throw new Error('Environment not loaded. Call loadEnv() at startup first.');
  }
  return cachedEnv;
};
