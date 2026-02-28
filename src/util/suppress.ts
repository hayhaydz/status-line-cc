// src/util/suppress.ts
/**
 * Execute a function and suppress any thrown errors.
 * Use for intentionally ignored operations like cleanup, logging, etc.
 */
export function suppress(fn: () => void): void {
  try {
    fn();
  } catch {
    // Intentionally suppressed
  }
}

/**
 * Execute an async function and suppress any thrown errors.
 */
export async function suppressAsync(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // Intentionally suppressed
  }
}
