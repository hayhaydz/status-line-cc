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

/** Start of anchor day (2026-02-21 00:00 UTC) */
const ANCHOR_DAY_START = new Date("2026-02-21T00:00:00Z");

/** Milliseconds in a day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Get days since anchor (mod 5 for cycle position)
 *
 * @param date - The date to calculate from
 * @returns Days since anchor (0-4, cycles every 5 days)
 */
export function getDaysSinceAnchor(date: Date): number {
  const diffMs = date.getTime() - ANCHOR_DAY_START.getTime();
  const days = Math.floor(diffMs / MS_PER_DAY);
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

  // Find the most recent reset time
  // Each reset is at HH:23
  let blockStartHour: number;
  let blockStartDayOffset = 0;

  // Check if we're before the first reset of the day
  const firstHour = getFirstResetHour(dayOffset);
  const firstResetMinutes = firstHour * 60 + 23;
  if (currentTimeInMinutes < firstResetMinutes) {
    // We're in a block that started on the previous day
    const prevDayOffset = (dayOffset - 1 + CYCLE_DAYS) % CYCLE_DAYS;
    const prevFirstHour = getFirstResetHour(prevDayOffset);
    const prevResetHours = getResetHoursForDay(prevDayOffset);

    // Find the last "same day" reset (not a "next day" reset)
    // A "next day" reset has hour < firstHour (it belongs to the next calendar day)
    blockStartHour = prevResetHours[prevResetHours.length - 1];
    for (let i = prevResetHours.length - 1; i >= 0; i--) {
      if (prevResetHours[i] >= prevFirstHour) {
        blockStartHour = prevResetHours[i];
        break;
      }
    }
    blockStartDayOffset = -1;
  } else {
    // Find the most recent reset today
    blockStartHour = resetHours[0];
    for (const hour of resetHours) {
      const resetMinutes = hour * 60 + 23;
      if (resetMinutes <= currentTimeInMinutes) {
        blockStartHour = hour;
      } else {
        break;
      }
    }
  }

  // Construct the block start date
  const blockStart = new Date(date);
  blockStart.setUTCHours(blockStartHour, 23, 0, 0);
  if (blockStartDayOffset === -1) {
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
