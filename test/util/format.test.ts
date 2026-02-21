/**
 * Tests for format utility
 */

import { describe, it, expect } from "bun:test";
import { formatWidgetValue, formatWidgetValueSimple } from "../../src/util/format.ts";
import type { WidgetConfig } from "../../src/types.js";

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
    expect(result).toBe("\uf0172h15m");
  });

  it("returns detailed format (icon + label + value)", () => {
    const config: WidgetConfig = { format: "detailed" };
    const result = formatWidgetValue("50%", icon, config, { short: "blk", long: "block" });
    expect(result).toBe("\uf017block:50%");
  });

  it("uses short label in compact mode", () => {
    const config: WidgetConfig = { format: "compact" };
    const result = formatWidgetValue("50%", icon, config, { short: "blk", long: "block" });
    expect(result).toBe("\uf017blk:50%");
  });

  it("defaults to compact format when format is undefined", () => {
    const config: WidgetConfig = {};
    const result = formatWidgetValue("50%", icon, config, { short: "blk", long: "block" });
    expect(result).toBe("\uf017blk:50%");
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
    expect(result).toBe("\uf01750%");
  });

  it("returns detailed format (icon + value)", () => {
    const config: WidgetConfig = { format: "detailed" };
    const result = formatWidgetValueSimple("50%", icon, config);
    expect(result).toBe("\uf01750%");
  });

  it("defaults to compact format when format is undefined", () => {
    const config: WidgetConfig = {};
    const result = formatWidgetValueSimple("50%", icon, config);
    expect(result).toBe("\uf01750%");
  });
});
