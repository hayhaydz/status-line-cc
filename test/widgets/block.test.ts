/**
 * Block Widget tests
 */

import { describe, it, expect } from "bun:test";
import { BlockWidget } from "../../src/widgets/block.ts";
import type { ClaudeCodeInput } from "../../src/types.ts";

describe("BlockWidget", () => {
  it("should show time remaining", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new BlockWidget();
    const result = await widget.render(input, {});

    expect(result).toMatch(/\d+h\d+m/); // Should show time like "2h30m"
  });

  it("should return time format even without API data", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new BlockWidget();
    const result = await widget.render(input, {});

    // Should always show time
    expect(result).toBeTruthy();
    expect(result).toMatch(/\d+h\d+m/);
  });
});
