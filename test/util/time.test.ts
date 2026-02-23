/**
 * Tests for time utility functions
 *
 * Tests block time calculation using China timezone (UTC+8) with 23-minute offset.
 * China blocks: 00:23, 05:23, 10:23, 15:23, 20:23
 * UTC equivalent: 16:23, 21:23 (prev day), 02:23, 07:23, 12:23
 *
 * Conversion: UTC_to_China = UTC + 8 hours
 *            China_to_UTC = China - 8 hours
 */

import { describe, it, expect } from "bun:test";
import { getCurrentBlockStart, getCurrentBlockEnd, getTimeRemaining, BLOCK_OFFSET_MINUTES } from "../../src/util/time.ts";

describe("getCurrentBlockStart", () => {
  // UTC 10:30 = China 18:30 → Block started at China 15:23 = UTC 07:23
  it("returns 07:23 UTC for China 15:23-20:22 block", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T10:30:00Z")); // China 18:30
    expect(result.getUTCHours()).toBe(7);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  // UTC 12:30 = China 20:30 → Block started at China 20:23 = UTC 12:23
  it("returns 12:23 UTC for China 20:23-00:22 block", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T12:30:00Z")); // China 20:30
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  // UTC 18:00 = China 02:00 → Block started at China 00:23 = UTC 16:23 (previous day)
  it("returns 16:23 UTC for China 00:23-05:22 block", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T18:00:00Z")); // China 02:00
    expect(result.getUTCHours()).toBe(16);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  // UTC 23:00 = China 07:00 → Block started at China 05:23 = UTC 21:23 (previous day)
  it("returns 21:23 UTC for China 05:23-10:22 block", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T23:00:00Z")); // China 07:00
    expect(result.getUTCHours()).toBe(21);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  // UTC 04:00 = China 12:00 → Block started at China 10:23 = UTC 02:23
  it("returns 02:23 UTC for China 10:23-15:22 block", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T04:00:00Z")); // China 12:00
    expect(result.getUTCHours()).toBe(2);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  // UTC 07:00 = China 15:00 → Block started at China 15:23 = UTC 07:23
  // Wait: China 15:00 is BEFORE 15:23, so it's still in previous block (10:23-15:22)
  // Block started at China 10:23 = UTC 02:23
  it("returns 02:23 UTC for China time before 15:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T07:00:00Z")); // China 15:00 (before 15:23)
    expect(result.getUTCHours()).toBe(2);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  // Edge case: exactly at block boundary (China 15:23 = UTC 07:23)
  it("returns 07:23 UTC for China exactly at 15:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T07:23:00Z")); // China 15:23 exactly
    expect(result.getUTCHours()).toBe(7);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  // Edge case: one minute before block boundary (China 15:22 = UTC 07:22)
  it("returns 02:23 UTC for China one minute before 15:23", () => {
    const result = getCurrentBlockStart(new Date("2026-02-21T07:22:00Z")); // China 15:22 (before 15:23)
    expect(result.getUTCHours()).toBe(2);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  it("preserves the UTC date components", () => {
    const input = new Date("2026-02-21T10:30:00Z");
    const result = getCurrentBlockStart(input);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(1); // February
  });
});

describe("getCurrentBlockEnd", () => {
  it("returns block end 5 hours after start", () => {
    const result = getCurrentBlockEnd(new Date("2026-02-21T10:30:00Z")); // China 18:30
    // Block started at UTC 07:23, ends at UTC 12:23
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });

  it("handles day boundary correctly", () => {
    const result = getCurrentBlockEnd(new Date("2026-02-21T18:00:00Z")); // China 02:00
    // Block started at UTC 16:23, ends at UTC 21:23
    expect(result.getUTCHours()).toBe(21);
    expect(result.getUTCMinutes()).toBe(BLOCK_OFFSET_MINUTES);
  });
});

describe("getTimeRemaining", () => {
  it("returns positive milliseconds within block", () => {
    const result = getTimeRemaining(new Date("2026-02-21T10:30:00Z"));
    expect(result).toBeGreaterThan(0);
  });

  it("returns approximately 5 hours at block start", () => {
    // Block starts at 07:23 UTC
    const result = getTimeRemaining(new Date("2026-02-21T07:23:00Z"));
    // Full 5 hours = 18000000 ms
    expect(result).toBeCloseTo(18000000, -3);
  });

  it("returns approximately 2.5 hours halfway through block", () => {
    // Block 07:23-12:23, at 09:53 we have ~2.5 hours left
    const result = getTimeRemaining(new Date("2026-02-21T09:53:00Z"));
    // 2.5 hours = 9000000 ms
    expect(result).toBeCloseTo(9000000, -3);
  });

  it("returns very small amount for time just before block end", () => {
    // Block 07:23-12:23, at 12:22:59 we have ~1 minute left
    const result = getTimeRemaining(new Date("2026-02-21T12:22:59Z"));
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(120000); // Less than 2 minutes
  });

  it("handles exact block boundary", () => {
    // At 12:23 UTC, we're at the start of a new block
    const result = getTimeRemaining(new Date("2026-02-21T12:23:00Z"));
    // Full 5 hours = 18000000 ms
    expect(result).toBeCloseTo(18000000, -3);
  });
});

describe("BLOCK_OFFSET_MINUTES", () => {
  it("is 23 minutes", () => {
    expect(BLOCK_OFFSET_MINUTES).toBe(23);
  });
});
