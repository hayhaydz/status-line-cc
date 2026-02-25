/**
 * Tests for time utility functions
 *
 * Tests block time calculation using drifting 5-day rotation.
 * Anchor: 2026-02-21 @ 21:23 UTC
 * Each day shifts back 1 hour, cycling every 5 days.
 */

import { describe, it, expect } from "bun:test";
import { getCurrentBlockStart, getCurrentBlockEnd, getTimeRemaining, BLOCK_OFFSET_MINUTES, ANCHOR_DATE, CYCLE_DAYS, getDaysSinceAnchor } from "../../src/util/time.ts";

describe("getCurrentBlockStart (drifting schedule)", () => {
  // Day 0 (Feb 21): resets at 01:23, 06:23, 11:23, 16:23, 21:23 UTC

  it("Feb 21 at 22:00 is in block that started at 21:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T22:00:00Z"));
    expect(result.getUTCHours()).toBe(21);
    expect(result.getUTCMinutes()).toBe(23);
    expect(result.getUTCDate()).toBe(21);
  });

  it("Feb 21 at 15:00 is in block that started at 11:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T15:00:00Z"));
    expect(result.getUTCHours()).toBe(11);
    expect(result.getUTCMinutes()).toBe(23);
  });

  it("Feb 21 at 02:00 is in block that started at 01:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T02:00:00Z"));
    expect(result.getUTCHours()).toBe(1);
    expect(result.getUTCMinutes()).toBe(23);
  });

  // Day 1 (Feb 22): resets at 00:23, 05:23, 10:23, 15:23, 20:23 UTC

  it("Feb 22 at 21:00 is in block that started at 20:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-22T21:00:00Z"));
    expect(result.getUTCHours()).toBe(20);
    expect(result.getUTCMinutes()).toBe(23);
    expect(result.getUTCDate()).toBe(22);
  });

  it("Feb 22 at 01:00 is in block that started at 00:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-22T01:00:00Z"));
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(23);
  });

  // Day 2 (Feb 23): resets at 04:23, 09:23, 14:23, 19:23, 00:23(+1)

  it("Feb 23 at 20:00 is in block that started at 19:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-23T20:00:00Z"));
    expect(result.getUTCHours()).toBe(19);
    expect(result.getUTCMinutes()).toBe(23);
  });

  it("Feb 23 at 03:00 is in block from previous day's last reset", () => {
    const result = getCurrentBlockStart(new Date("2026-02-23T03:00:00Z"));
    // At 03:00 on Feb 23, the most recent reset should be...
    // Day 1's last reset: 20:23 on Feb 22
    // Day 2's first reset: 04:23 on Feb 23
    // So we're still in the block from 20:23 Feb 22
    expect(result.getUTCHours()).toBe(20);
    expect(result.getUTCMinutes()).toBe(23);
    expect(result.getUTCDate()).toBe(22); // Still Feb 22
  });

  // Day 3 (Feb 24): resets at 03:23, 08:23, 13:23, 18:23, 23:23

  it("Feb 24 at 10:00 is in block that started at 08:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-24T10:00:00Z"));
    expect(result.getUTCHours()).toBe(8);
    expect(result.getUTCMinutes()).toBe(23);
  });

  // Day 4 (Feb 25): resets at 02:23, 07:23, 12:23, 17:23, 22:23

  it("Feb 25 at 15:00 is in block that started at 12:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-25T15:00:00Z"));
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(23);
  });

  // Cycle repeat test

  it("Feb 26 at 22:00 is in block that started at 21:23 (same as Feb 21)", () => {
    const result = getCurrentBlockStart(new Date("2026-02-26T22:00:00Z"));
    expect(result.getUTCHours()).toBe(21);
    expect(result.getUTCMinutes()).toBe(23);
  });

  // Edge cases

  it("handles exactly at reset time", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T21:23:00Z"));
    expect(result.getUTCHours()).toBe(21);
    expect(result.getUTCMinutes()).toBe(23);
  });

  it("handles one minute before reset", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T21:22:00Z"));
    expect(result.getUTCHours()).toBe(16); // Previous block
    expect(result.getUTCMinutes()).toBe(23);
  });

  it("Feb 25 at 22:30 is in block that started at 22:23", () => {
    // Day 4 (Feb 25): resets at 02:23, 07:23, 12:23, 17:23, 22:23
    const result = getCurrentBlockStart(new Date("2026-02-25T22:30:00Z"));
    expect(result.getUTCHours()).toBe(22);
    expect(result.getUTCMinutes()).toBe(23);
    expect(result.getUTCDate()).toBe(25);
  });
});

describe("getCurrentBlockEnd", () => {
  it("returns block end 5 hours after start", () => {
    const result = getCurrentBlockEnd(new Date("2026-02-21T22:00:00Z"));
    // Block started at UTC 21:23, ends at UTC 02:23 (next day)
    expect(result.getUTCHours()).toBe(2);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  it("handles day boundary correctly", () => {
    const result = getCurrentBlockEnd(new Date("2026-02-21T02:00:00Z"));
    // Block started at UTC 01:23, ends at UTC 06:23
    expect(result.getUTCHours()).toBe(6);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });
});

describe("getTimeRemaining", () => {
  it("returns positive milliseconds within block", () => {
    const result = getTimeRemaining(new Date("2026-02-21T22:00:00Z"));
    expect(result).toBeGreaterThan(0);
  });

  it("returns approximately 5 hours at block start", () => {
    // Block starts at 21:23 UTC on Feb 21
    const result = getTimeRemaining(new Date("2026-02-21T21:23:00Z"));
    // Full 5 hours = 18000000 ms
    expect(result).toBeCloseTo(18000000, -3);
  });

  it("returns approximately 2.5 hours halfway through block", () => {
    // Block 21:23-02:23, at 23:53 we have ~2.5 hours left
    const result = getTimeRemaining(new Date("2026-02-21T23:53:00Z"));
    // 2.5 hours = 9000000 ms
    expect(result).toBeCloseTo(9000000, -3);
  });

  it("returns very small amount for time just before block end", () => {
    // Day 1 (Feb 22): Block 00:23-05:23, at 05:22:59 we have ~1 minute left
    const result = getTimeRemaining(new Date("2026-02-22T05:22:59Z"));
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(120000); // Less than 2 minutes
  });

  it("handles exact block boundary", () => {
    // Day 1 (Feb 22): At 05:23 UTC, we're at the start of a new block
    const result = getTimeRemaining(new Date("2026-02-22T05:23:00Z"));
    // Full 5 hours = 18000000 ms
    expect(result).toBeCloseTo(18000000, -3);
  });
});

describe("BLOCK_OFFSET_MINUTES", () => {
  it("is 23 minutes", () => {
    expect(BLOCK_OFFSET_MINUTES).toBe(23);
  });
});

describe("ANCHOR_DATE", () => {
  it("is 2026-02-21 at 21:23 UTC", () => {
    expect(ANCHOR_DATE.getUTCFullYear()).toBe(2026);
    expect(ANCHOR_DATE.getUTCMonth()).toBe(1); // February
    expect(ANCHOR_DATE.getUTCDate()).toBe(21);
    expect(ANCHOR_DATE.getUTCHours()).toBe(21);
    expect(ANCHOR_DATE.getUTCMinutes()).toBe(23);
  });
});

describe("CYCLE_DAYS", () => {
  it("is 5 days", () => {
    expect(CYCLE_DAYS).toBe(5);
  });
});

describe("getDaysSinceAnchor", () => {
  it("returns 0 for anchor date", () => {
    const result = getDaysSinceAnchor(new Date("2026-02-21T00:00:00Z"));
    expect(result).toBe(0);
  });

  it("returns 1 for day after anchor", () => {
    const result = getDaysSinceAnchor(new Date("2026-02-22T00:00:00Z"));
    expect(result).toBe(1);
  });

  it("returns 2 for Feb 23", () => {
    const result = getDaysSinceAnchor(new Date("2026-02-23T00:00:00Z"));
    expect(result).toBe(2);
  });

  it("returns 4 for Feb 25", () => {
    const result = getDaysSinceAnchor(new Date("2026-02-25T00:00:00Z"));
    expect(result).toBe(4);
  });

  it("returns 0 for Feb 26 (cycle repeats)", () => {
    const result = getDaysSinceAnchor(new Date("2026-02-26T00:00:00Z"));
    expect(result).toBe(0);
  });

  it("returns 1 for Feb 27 (day 6 = day 1 in cycle)", () => {
    const result = getDaysSinceAnchor(new Date("2026-02-27T00:00:00Z"));
    expect(result).toBe(1);
  });

  it("handles time within day correctly", () => {
    // Any time on Feb 21 is day 0
    const result = getDaysSinceAnchor(new Date("2026-02-21T23:59:59Z"));
    expect(result).toBe(0);
  });
});
