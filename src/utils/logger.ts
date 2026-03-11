/**
 * Production-safe logging utilities.
 * In production builds, all output is suppressed.
 */

const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args: unknown[]) => { if (isDev) console.log(...args); },
    warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
    error: (...args: unknown[]) => { if (isDev) console.error(...args); },
};
