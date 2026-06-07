/**
 * Tiny leveled logger for the web client. `debug`/`info` are silenced in
 * production builds (Vite's `import.meta.env.PROD`) so only `warn`/`error`
 * surface there; all levels print during development.
 */

const isProduction = (): boolean => import.meta.env.PROD;

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
