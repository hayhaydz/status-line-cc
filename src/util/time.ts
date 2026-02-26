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

/** Anchor date for the 5-day rotation cycle (2026-02-21 @ 21:23 UTC) */
export const ANCHOR_DATE = new Date("2026-02-21T21:23:00Z");

/**
 * Get days since anchor (mod 5 for cycle position)
 *
 * @param date - The date to calculate from
 * @returns Days since anchor (0-4, cycles every 5 days)
 */
export function getDaysSinceAnchor(date: Date): number {
  const anchorDayStart = new Date("2026-02-21T00:00:00Z");
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = date.getTime() - anchorDayStart.getTime();
  const days = Math.floor(diffMs / msPerDay);
  return ((days % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS; // Handle negative values
}

/**
 * Get the first reset hour for a given day
 *
 * The first reset hour follows the pattern: 1, 0, 4, 3, 2 (repeating every 5 days)
 * Formula: firstHour = (1 - dayOffset + 5) % 5
 *
 * @param dayOffset - Days since anchor (0-4)
 * @returns The first reset hour (0-4)
 */
function getFirstResetHour(dayOffset: number): number {
  return (1 - dayOffset + 5) % 5;
}

/**
 * Get all reset hours for a given day (as hours since midnight UTC)
 *
 * The first reset hour follows the pattern: 1, 0, 4, 3, 2 (repeating every 5 days)
 * Then all 5 resets are at firstHour, firstHour+5, firstHour+10, firstHour+15, firstHour+20 (mod 24)
 *
 * @param dayOffset - Days since anchor (0-4)
 * @returns Array of hours (0-23) for reset times, sorted
 */
function getResetHoursForDay(dayOffset: number): number[] {
  const firstHour = getFirstResetHour(dayOffset);
  return [0, 5, 10, 15, 20]
    .map(offset => (firstHour + offset) % 24)
    .sort((a, b) => a - b);
}

/**
 * Find the most recent reset hour from today's schedule.
 *
 * @param resetHours - Today's reset hours (sorted ascending)
 * @param currentTimeInMinutes - Current time in minutes since midnight
 * @returns The most recent reset hour, or undefined if before first reset
 */
function findBlockStartInCurrentDay(
  resetHours: number[],
  currentTimeInMinutes: number
): number | undefined {
  // Return the last hour that was <= currentTimeInMinutes
  for (let i = resetHours.length - 1; i >= 0; i--) {
    if (resetHours[i] * 60 + BLOCK_OFFSET_MINUTES <= currentTimeInMinutes) {
      return resetHours[i];
    }
  }
  return undefined;
}

/**
 * Find the last valid block start hour from previous day.
 * A "next day" reset (hour < firstHour) doesn't belong to the current day.
 *
 * @param prevDayOffset - Previous day's offset
 * @returns The last block start hour from previous day
 */
function findLastBlockStartFromPreviousDay(prevDayOffset: number): number {
  const prevFirstHour = getFirstResetHour(prevDayOffset);
  const prevResetHours = getResetHoursForDay(prevDayOffset);

  // Find the last "same day" reset (not a "next day" reset)
  for (let i = prevResetHours.length - 1; i >= 0; i--) {
    if (prevResetHours[i] >= prevFirstHour) {
      return prevResetHours[i];
    }
  }
  // Fallback to the last hour
  return prevResetHours[prevResetHours.length - 1];
}

/**
 * Get current block start time using drifting 5-day rotation
 *
 * @param date - The date to calculate block start for (defaults to now)
 * @returns Date representing the start of the current 5-hour block
 */
export function getCurrentBlockStart(date: Date = new Date()): Date {
  const dayOffset = getDaysSinceAnchor(date);
  const resetHours = getResetHoursForDay(dayOffset);

  const currentHour = date.getUTCHours();
  const currentMinute = date.getUTCMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Check if we're before the first reset of the day
  const firstHour = getFirstResetHour(dayOffset);
  const firstResetMinutes = firstHour * 60 + BLOCK_OFFSET_MINUTES;

  let blockStartHour: number;
  let needsPreviousDay = false;

  if (currentTimeInMinutes < firstResetMinutes) {
    // We're in a block that started on the previous day
    const prevDayOffset = (dayOffset - 1 + CYCLE_DAYS) % CYCLE_DAYS;
    blockStartHour = findLastBlockStartFromPreviousDay(prevDayOffset);
    needsPreviousDay = true;
  } else {
    // Find the most recent reset today
    const found = findBlockStartInCurrentDay(resetHours, currentTimeInMinutes);
    blockStartHour = found ?? resetHours[0];
  }

  // Construct the block start date
  const blockStart = new Date(date);
  blockStart.setUTCHours(blockStartHour, BLOCK_OFFSET_MINUTES, 0, 0);
  if (needsPreviousDay) {
    blockStart.setUTCDate(blockStart.getUTCDate() - 1);
  }

  return blockStart;
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
