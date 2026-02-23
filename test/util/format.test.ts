/**
 * Tests for format utility
 */

import { describe, it, expect } from "bun:test";
import { formatWidgetValue, formatWidgetValueSimple, isTextLabel } from "../../src/util/format.ts";
import type { WidgetConfig } from "../../src/types.js";

describe("isTextLabel", () => {
  it("returns true for text label ending with colon", () => {
    expect(isTextLabel("g:")).toBe(true);
    expect(isTextLabel("m:")).toBe(true);
    expect(isTextLabel("t:")).toBe(true);
    expect(isTextLabel("ctx:")).toBe(true);
  });

  it("returns false for nerd font icons", () => {
    expect(isTextLabel("\ue725")).toBe(false);
    expect(isTextLabel("\uf017")).toBe(false);
    expect(isTextLabel("\uf412")).toBe(false);
  });

  it("returns false for emoji icons", () => {
    expect(isTextLabel("🌿")).toBe(false);
    expect(isTextLabel("🤖")).toBe(false);
    expect(isTextLabel("⚡")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isTextLabel("")).toBe(false);
  });

  it("returns false for text without colon", () => {
    expect(isTextLabel("git")).toBe(false);
    expect(isTextLabel("main")).toBe(false);
  });
});

describe("formatWidgetValue", () => {
  const icon = "\uf017";

  it("returns minimal format (value only)", () => {
    const config: WidgetConfig = { format: "minimal" };
    const result = formatWidgetValue("50", icon, config, { short: "blk", long: "block" });
    expect(result).toBe("50");
  });

  it("returns compact format with empty label", () => {
    const config: WidgetConfig = { format: "compact" };
    const result = formatWidgetValue("2h15m", icon, config, { short: "", long: "" });
    expect(result).toBe("\uf017 2h15m");
  });

  it("returns detailed format (icon + label + value)", () => {
    const config: WidgetConfig = { format: "detailed" };
    const result = formatWidgetValue("50%", icon, config, { short: "blk", long: "block" });
    expect(result).toBe("\uf017 block:50%");
  });

  it("uses short label in compact mode", () => {
    const config: WidgetConfig = { format: "compact" };
    const result = formatWidgetValue("50%", icon, config, { short: "blk", long: "block" });
    expect(result).toBe("\uf017 blk:50%");
  });

  it("defaults to compact format when format is undefined", () => {
    const config: WidgetConfig = {};
    const result = formatWidgetValue("50%", icon, config, { short: "blk", long: "block" });
    expect(result).toBe("\uf017 blk:50%");
  });

  it("uses no space before value when icon is text label", () => {
    const config: WidgetConfig = { format: "compact" };
    const textIcon = "g:";
    const result = formatWidgetValue("main", textIcon, config, { short: "", long: "" });
    expect(result).toBe("g:main");
  });

  it("uses space before value when icon is nerd font", () => {
    const config: WidgetConfig = { format: "compact" };
    const nerdFontIcon = "\ue725";
    const result = formatWidgetValue("main", nerdFontIcon, config, { short: "", long: "" });
    expect(result).toBe("\ue725 main");
  });

  it("uses space before value when icon is emoji", () => {
    const config: WidgetConfig = { format: "compact" };
    const emojiIcon = "🌿";
    const result = formatWidgetValue("main", emojiIcon, config, { short: "", long: "" });
    expect(result).toBe("🌿 main");
  });

  it("uses no space with text label even when label is provided", () => {
    const config: WidgetConfig = { format: "compact" };
    const textIcon = "t:";
    const result = formatWidgetValue("50%", textIcon, config, { short: "blk", long: "block" });
    expect(result).toBe("t:blk:50%");
  });
});

describe("formatWidgetValueSimple", () => {
  const icon = "\uf017";

  it("returns minimal format", () => {
    const config: WidgetConfig = { format: "minimal" };
    const result = formatWidgetValueSimple("50", icon, config);
    expect(result).toBe("50");
  });

  it("returns compact format (icon + value)", () => {
    const config: WidgetConfig = { format: "compact" };
    const result = formatWidgetValueSimple("50%", icon, config);
    expect(result).toBe("\uf017 50%");
  });

  it("returns detailed format (icon + value)", () => {
    const config: WidgetConfig = { format: "detailed" };
    const result = formatWidgetValueSimple("50%", icon, config);
    expect(result).toBe("\uf017 50%");
  });

  it("defaults to compact format when format is undefined", () => {
    const config: WidgetConfig = {};
    const result = formatWidgetValueSimple("50%", icon, config);
    expect(result).toBe("\uf017 50%");
  });

  it("uses no space before value when icon is text label", () => {
    const config: WidgetConfig = { format: "compact" };
    const textIcon = "g:";
    const result = formatWidgetValueSimple("main", textIcon, config);
    expect(result).toBe("g:main");
  });

  it("uses space before value when icon is nerd font", () => {
    const config: WidgetConfig = { format: "compact" };
    const nerdFontIcon = "\ue725";
    const result = formatWidgetValueSimple("main", nerdFontIcon, config);
    expect(result).toBe("\ue725 main");
  });

  it("uses space before value when icon is emoji", () => {
    const config: WidgetConfig = { format: "compact" };
    const emojiIcon = "🤖";
    const result = formatWidgetValueSimple("glm-5", emojiIcon, config);
    expect(result).toBe("🤖 glm-5");
  });
});
