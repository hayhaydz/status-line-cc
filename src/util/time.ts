/**
 * Time utility functions
 *
 * Provides simplified block time calculation using math instead of loops.
 * Block schedule: 5-hour blocks starting at 00:00, 05:00, 10:00, 15:00, 20:00 UTC.
 */

/** Block duration in milliseconds (5 hours) */
export const BLOCK_DURATION = 5 * 60 * 60 * 1000;

/**
 * Get current block start time in UTC
 *
 * Uses simple math: Math.floor(hour / 5) * 5 to find the block start hour.
 * Much simpler than looping through an array.
 *
 * @param date - The date to calculate block start for (defaults to now)
 * @returns Date representing the start of the current 5-hour block
 */
export function getCurrentBlockStart(date: Date = new Date()): Date {
  const utcHour = date.getUTCHours();
  const blockStartHour = Math.floor(utcHour / 5) * 5;

  const blockStart = new Date(date);
  blockStart.setUTCHours(blockStartHour, 0, 0, 0);

  return blockStart;
}

/**
 * Get current block end time in UTC
 *
 * @param date - The date to calculate block end for (defaults to now)
 * @returns Date representing the end of the current 5-hour block
 */
export function getCurrentBlockEnd(date: Date = new Date()): Date {
  const blockStart = getCurrentBlockStart(date);
  return new Date(blockStart.getTime() + BLOCK_DURATION);
}

/**
 * Calculate time remaining in current block (milliseconds)
 *
 * @param date - The date to calculate time remaining for (defaults to now)
 * @returns Milliseconds remaining in the current block (always >= 0)
 */
export function getTimeRemaining(date: Date = new Date()): number {
  const blockEnd = getCurrentBlockEnd(date);
  return Math.max(0, blockEnd.getTime() - date.getTime());
}
