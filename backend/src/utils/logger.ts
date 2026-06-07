/**
 * Tiny leveled logger. `debug`/`info` are silenced in production so only
 * `warn`/`error` reach the logs there; all levels print otherwise.
 *
 * Reads `process.env.NODE_ENV` directly (not the validated env accessor) so it
 * is safe to use from modules that load before `loadEnv()` runs at startup.
 */

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

type LogArgs = readonly unknown[];

export const logger = {
  debug: (...args: LogArgs): void => {
    if (!isProduction()) {
      console.debug(...args);
    }
  },
  info: (...args: LogArgs): void => {
    if (!isProduction()) {
      console.info(...args);
    }
  },
  warn: (...args: LogArgs): void => {
    console.warn(...args);
  },
  error: (...args: LogArgs): void => {
    console.error(...args);
  },
};
