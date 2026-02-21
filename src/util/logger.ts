/**
 * Logger utility for statusline-hyz-cc
 *
 * Provides debug, info, warn, error methods respecting verbose mode.
 * In non-verbose mode, only warnings and errors are output.
 */

import type { Config } from "../types.js";

/** Global verbose mode flag (controlled by config) */
let verbose = false;

/**
 * Enable or disable verbose mode
 */
export function setVerbose(enabled: boolean): void {
  verbose = enabled;
}

/**
 * Get current verbose mode
 */
export function isVerbose(): boolean {
  return verbose;
}

/**
 * Configure logger from config object
 */
export function configureFromConfig(config: Config): void {
  setVerbose(config.verbose ?? false);
}

/**
 * Log debug message (only in verbose mode)
 */
export function debug(message: string, ...args: unknown[]): void {
  if (verbose) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
}

/**
 * Log info message (only in verbose mode)
 */
export function info(message: string, ...args: unknown[]): void {
  if (verbose) {
    console.info(`[INFO] ${message}`, ...args);
  }
}

/**
 * Log warning (always shown)
 */
export function warn(message: string, ...args: unknown[]): void {
  console.warn(`[WARN] ${message}`, ...args);
}

/**
 * Log error (always shown)
 */
export function error(message: string, ...args: unknown[]): void {
  console.error(`[ERROR] ${message}`, ...args);
}

/**
 * Create a scoped logger with prefix
 */
export function createScope(scope: string): {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
} {
  return {
    debug: (message: string, ...args: unknown[]) => debug(`[${scope}] ${message}`, ...args),
    info: (message: string, ...args: unknown[]) => info(`[${scope}] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => warn(`[${scope}] ${message}`, ...args),
    error: (message: string, ...args: unknown[]) => error(`[${scope}] ${message}`, ...args),
  };
}
