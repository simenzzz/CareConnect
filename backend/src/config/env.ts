import dotenv from 'dotenv';
import { z } from 'zod';

// Populate process.env from .env at module load. Because this is intended to be
// the first local import in the app, it runs before any other module reads config.
dotenv.config();

/**
 * Centralized, validated environment configuration.
 *
 * All secrets and URLs are read here exactly once. There are deliberately NO
 * insecure fallbacks (no `|| 'password'`, no `|| 'placeholder'`, no
 * `|| 'localhost'`): if a required variable is missing or malformed the process
 * fails fast at startup instead of booting into an insecure state.
 */

const nonEmpty = (label: string) =>
  z.string({ message: `${label} is required` }).trim().min(1, `${label} is required`);

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

  // Firebase Admin (service account)
  FIREBASE_PROJECT_ID: nonEmpty('FIREBASE_PROJECT_ID'),
  FIREBASE_PRIVATE_KEY_ID: nonEmpty('FIREBASE_PRIVATE_KEY_ID'),
  FIREBASE_PRIVATE_KEY: nonEmpty('FIREBASE_PRIVATE_KEY'),
  FIREBASE_CLIENT_EMAIL: nonEmpty('FIREBASE_CLIENT_EMAIL'),
  FIREBASE_CLIENT_ID: nonEmpty('FIREBASE_CLIENT_ID'),

  // Whish Money payments
  WHISH_API_URL: z.url({ message: 'WHISH_API_URL must be a valid URL' }),
  WHISH_CHANNEL: nonEmpty('WHISH_CHANNEL'),
  WHISH_SECRET: nonEmpty('WHISH_SECRET'),
  WHISH_WEBSITE_URL: z.url({ message: 'WHISH_WEBSITE_URL must be a valid URL' }),
  PAYMENT_CURRENCY: z.string().trim().min(1).default('USD'),
});

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
