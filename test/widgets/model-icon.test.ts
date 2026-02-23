import { describe, it, expect } from "bun:test";
import { ModelWidget } from "../../src/widgets/model.ts";
import type { Config, WidgetConfig } from "../../src/types.ts";

/** Strip ANSI color codes for cleaner test assertions */
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]+m/g, "");
}

describe("ModelWidget icon modes", () => {
  it("should use nerd font icon by default", () => {
    const widget = new ModelWidget();
    expect(widget.defaultIcon).toBe("\u{e26d}");
  });

  it("should select text icon when iconMode is 'text'", () => {
    const widget = new ModelWidget();
    const mockGlobalConfig: Config = { iconMode: "text" };
    const icon = widget.getIcon({}, mockGlobalConfig);
    expect(icon).toBe("m:");
  });

  it("should select emoji icon when iconMode is 'emoji'", () => {
    const widget = new ModelWidget();
    const mockGlobalConfig: Config = { iconMode: "emoji" };
    const icon = widget.getIcon({}, mockGlobalConfig);
    expect(icon).toBe("🤖");
  });
});

describe("ModelWidget conditional formatting", () => {
  const mockInput = {
    model: "glm-5",
  };

  const mockGlobalConfig: Config = {
    iconMode: "text",
    theme: "monochrome",
    concurrencyLimits: {
      "glm-5": 3,
    },
  };

  const widgetConfig: WidgetConfig = {};

  it("should format text mode as 'm:GLM-5 3x' (no space, no parens)", async () => {
    const widget = new ModelWidget();
    const textConfig: Config = { ...mockGlobalConfig, iconMode: "text" };
    const result = await widget.render(mockInput, widgetConfig, textConfig);
    // Text mode: no space after label, no parens around multiplier
    expect(stripAnsi(result)).toBe("m:GLM-5 3x");
  });

  it("should format icon mode with space and parens", async () => {
    const widget = new ModelWidget();
    const iconConfig: Config = { ...mockGlobalConfig, iconMode: "nerdfont" };
    const result = await widget.render(mockInput, widgetConfig, iconConfig);
    // Icon mode: space after icon, parens around multiplier
    expect(result).toContain("GLM-5");
    expect(result).toContain("(3x)");
    // Should have a space between icon and model name
    const parts = stripAnsi(result).split("GLM-5");
    expect(parts[0]).toBe("\u{e26d} ");
  });

  it("should format emoji mode with space and parens", async () => {
    const widget = new ModelWidget();
    const emojiConfig: Config = { ...mockGlobalConfig, iconMode: "emoji" };
    const result = await widget.render(mockInput, widgetConfig, emojiConfig);
    // Emoji mode: space after emoji, parens around multiplier
    expect(result).toContain("GLM-5");
    expect(result).toContain("(3x)");
    // Should have a space between emoji and model name
    const parts = stripAnsi(result).split("GLM-5");
    expect(parts[0]).toBe("🤖 ");
  });
});
