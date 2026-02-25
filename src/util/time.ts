/**
 * Time utility functions
 *
 * Provides block time calculation for GLM Coding Plan.
 *
 * Uses a drifting 5-day rotation cycle anchored to 2026-02-21 @ 21:23 UTC.
 * Because 24 is not divisible by 5, the schedule drifts backward by 1 hour each day.
 * The cycle repeats every 5 days (120 hours).
 */

/** Block duration in milliseconds (5 hours) */
export const BLOCK_DURATION = 5 * 60 * 60 * 1000;

/** Block offset in minutes (blocks start at :23, not :00) */
export const BLOCK_OFFSET_MINUTES = 23;

/** Rotation cycle length in days */
export const CYCLE_DAYS = 5;

/** Anchor date: 2026-02-21 @ 21:23 UTC - the reference point for the rotation */
export const ANCHOR_DATE = new Date("2026-02-21T21:23:00Z");

/** China timezone offset from UTC in hours */
export const CHINA_TIMEZONE_OFFSET = 8;

/**
 * Get current time in China timezone (UTC+8)
 *
 * @param date - The date to convert (defaults to now)
 * @returns Object with China time components
 */
function getChinaTime(date: Date = new Date()): { hours: number; minutes: number; totalMs: number } {
  const utcMs = date.getTime();
  const chinaMs = utcMs + CHINA_TIMEZONE_OFFSET * 60 * 60 * 1000;

  const chinaDate = new Date(chinaMs);
  return {
    hours: chinaDate.getUTCHours(),
    minutes: chinaDate.getUTCMinutes(),
    totalMs: chinaMs,
  };
}

/**
 * Get current block start time
 *
 * Uses China timezone (UTC+8) with 23-minute offset.
 * Blocks: 00:23, 05:23, 10:23, 15:23, 20:23 China time.
 *
 * @param date - The date to calculate block start for (defaults to now)
 * @returns Date representing the start of the current 5-hour block
 */
export function getCurrentBlockStart(date: Date = new Date()): Date {
  const china = getChinaTime(date);

  // Find block start hour (0, 5, 10, 15, 20)
  // Adjust for the 23-minute offset: if minutes >= 23, we're in the next block segment
  let blockStartHour = Math.floor(china.hours / 5) * 5;

  // If current time is before the offset (e.g., 00:00-00:22), we're still in previous block
  if (china.hours % 5 === 0 && china.minutes < BLOCK_OFFSET_MINUTES) {
    blockStartHour -= 5;
    if (blockStartHour < 0) {
      blockStartHour = 20; // Previous day's last block
    }
  }

  // Calculate block start in China time (as ms from epoch)
  const blockStartChinaMs = china.totalMs
    - (china.hours * 60 * 60 * 1000)
    - (china.minutes * 60 * 1000)
    - date.getUTCSeconds() * 1000
    - date.getUTCMilliseconds()
    + (blockStartHour * 60 * 60 * 1000)
    + (BLOCK_OFFSET_MINUTES * 60 * 1000);

  // Convert back to UTC
  const blockStartUtcMs = blockStartChinaMs - CHINA_TIMEZONE_OFFSET * 60 * 60 * 1000;

  return new Date(blockStartUtcMs);
}

/**
 * Get current block end time
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
