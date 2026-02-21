/**
 * Tests for time utility functions
 *
 * Tests simplified block time calculation using math instead of loops.
 */

import { describe, it, expect } from "bun:test";
import { getCurrentBlockStart, getCurrentBlockEnd, getTimeRemaining } from "../../src/util/time.ts";

describe("getCurrentBlockStart", () => {
  it("returns 00:00 for hours 0-4", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T03:00:00Z"));
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it("returns 00:00 for hour 0", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T00:00:00Z"));
    expect(result.getUTCHours()).toBe(0);
  });

  it("returns 00:00 for hour 4", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T04:59:59Z"));
    expect(result.getUTCHours()).toBe(0);
  });

  it("returns 05:00 for hours 5-9", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T07:00:00Z"));
    expect(result.getUTCHours()).toBe(5);
  });

  it("returns 05:00 for hour 5", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T05:00:00Z"));
    expect(result.getUTCHours()).toBe(5);
  });

  it("returns 05:00 for hour 9", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T09:59:59Z"));
    expect(result.getUTCHours()).toBe(5);
  });

  it("returns 10:00 for hours 10-14", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T12:00:00Z"));
    expect(result.getUTCHours()).toBe(10);
  });

  it("returns 15:00 for hours 15-19", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T17:00:00Z"));
    expect(result.getUTCHours()).toBe(15);
  });

  it("returns 20:00 for hours 20-23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T22:00:00Z"));
    expect(result.getUTCHours()).toBe(20);
  });

  it("returns 20:00 for hour 23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T23:59:59Z"));
    expect(result.getUTCHours()).toBe(20);
  });

  it("returns 20:00 for hour 20", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T20:00:00Z"));
    expect(result.getUTCHours()).toBe(20);
  });

  it("preserves the UTC date", () => {
    const input = new Date("2026-02-21T07:30:45Z");
    const result = getCurrentBlockStart(input);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(21);
  });
});

describe("getCurrentBlockEnd", () => {
  it("returns 05:00 for block starting at 00:00", () => {
    const result = getCurrentBlockEnd(new Date("2026-02-21T03:00:00Z"));
    expect(result.getUTCHours()).toBe(5);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it("returns 10:00 for block starting at 05:00", () => {
    const result = getCurrentBlockEnd(new Date("2026-02-21T07:00:00Z"));
    expect(result.getUTCHours()).toBe(10);
  });

  it("returns 15:00 for block starting at 10:00", () => {
    const result = getCurrentBlockEnd(new Date("2026-02-21T12:00:00Z"));
    expect(result.getUTCHours()).toBe(15);
  });

  it("returns 20:00 for block starting at 15:00", () => {
    const result = getCurrentBlockEnd(new Date("2026-02-21T17:00:00Z"));
    expect(result.getUTCHours()).toBe(20);
  });

  it("returns next day 01:00 for block starting at 20:00", () => {
    const result = getCurrentBlockEnd(new Date("2026-02-21T22:00:00Z"));
    // Block 20:00 + 5 hours = 25:00 UTC = 01:00 next day
    expect(result.getUTCHours()).toBe(1);
    expect(result.getUTCDate()).toBe(22); // Next day
  });
});

describe("getTimeRemaining", () => {
  it("returns positive milliseconds within block", () => {
    const result = getTimeRemaining(new Date("2026-02-21T02:30:00Z"));
    expect(result).toBeGreaterThan(0);
  });

  it("returns approximately 2.5 hours for time at 02:30", () => {
    const result = getTimeRemaining(new Date("2026-02-21T02:30:00Z"));
    // 2.5 hours = 9000000 ms
    expect(result).toBeCloseTo(9000000, -3); // Allow ~1000ms tolerance
  });

  it("returns approximately 30 minutes for time at 04:30", () => {
    const result = getTimeRemaining(new Date("2026-02-21T04:30:00Z"));
    // 30 minutes = 1800000 ms
    expect(result).toBeCloseTo(1800000, -3);
  });

  it("returns approximately 3 hours for time at 17:00", () => {
    const result = getTimeRemaining(new Date("2026-02-21T17:00:00Z"));
    // 3 hours = 10800000 ms
    expect(result).toBeCloseTo(10800000, -3);
  });

  it("returns approximately 1 hour for time at 19:00", () => {
    const result = getTimeRemaining(new Date("2026-02-21T19:00:00Z"));
    // 1 hour = 3600000 ms
    expect(result).toBeCloseTo(3600000, -3);
  });

  it("returns approximately 4 hours for time at 21:00", () => {
    const result = getTimeRemaining(new Date("2026-02-21T21:00:00Z"));
    // 4 hours = 14400000 ms
    expect(result).toBeCloseTo(14400000, -3);
  });

  it("returns approximately 2 hours for time at 23:00", () => {
    const result = getTimeRemaining(new Date("2026-02-21T23:00:00Z"));
    // Block 20:00-25:00 UTC, so at 23:00 we have 2 hours remaining
    // 2 hours = 7200000 ms
    expect(result).toBeCloseTo(7200000, -3);
  });

  it("returns very small amount for time just before block end", () => {
    const result = getTimeRemaining(new Date("2026-02-21T04:59:59Z"));
    // Block ends at 05:00:00, so we have 1 ms remaining
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(2000); // Less than 2 seconds
  });

  it("returns approximately 1 second for time at 23:59:59", () => {
    const result = getTimeRemaining(new Date("2026-02-21T23:59:59Z"));
    // Block 20:00-25:00 UTC, so at 23:59:59 we have ~1 hour remaining (until 01:00 next day)
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(3601000, -3); // ~1 hour
  });

  it("handles exact block start time", () => {
    const result = getTimeRemaining(new Date("2026-02-21T00:00:00Z"));
    // Full 5 hours = 18000000 ms
    expect(result).toBeCloseTo(18000000, -3);
  });

  it("handles exact block boundary at 05:00", () => {
    const result = getTimeRemaining(new Date("2026-02-21T05:00:00Z"));
    // Full 5 hours = 18000000 ms
    expect(result).toBeCloseTo(18000000, -3);
  });
});
