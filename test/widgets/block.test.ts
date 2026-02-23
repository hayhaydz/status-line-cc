/**
 * Block Widget tests
 */

import { describe, it, expect } from "bun:test";
import { BlockWidget } from "../../src/widgets/block.ts";
import type { ClaudeCodeInput } from "../../src/types.ts";

describe("BlockWidget", () => {
  it("should show time remaining with icon", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new BlockWidget();
    const result = await widget.render(input, { format: "compact" });

    expect(result).toContain("\u{f19bb}"); // nf-mdi-timer icon (need braces for codepoints > FFFF)
    expect(result).toMatch(/\d+h\d+m/); // Should show time like "2h30m"
  });

  it("should show minimal format (hours only)", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new BlockWidget();
    const result = await widget.render(input, { format: "minimal" });

    expect(result).toMatch(/\d+h/); // Should show like "2h"
  });

  it("should show detailed format with label", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new BlockWidget();
    const result = await widget.render(input, { format: "detailed" });

    expect(result).toContain("b:"); // Should show "b:" label
    // Time format could be "2h 30m" or just "5m" depending on current time
    expect(result).toMatch(/\d+[hm]\s*\d*[hm]?/);
  });

  it("should show text icon in text mode", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new BlockWidget();
    const result = await widget.render(input, { format: "compact" }, { iconMode: "text" });

    expect(result).toContain("b:"); // Should show "b:" label
  });

  it("should show emoji icon in emoji mode", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new BlockWidget();
    const result = await widget.render(input, { format: "compact" }, { iconMode: "emoji" });

    expect(result).toContain("⏱️"); // Should show stopwatch emoji
  });
});
