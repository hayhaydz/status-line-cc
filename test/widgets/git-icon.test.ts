import { describe, it, expect } from "bun:test";
import { GitWidget } from "../../src/widgets/git.ts";
import type { Config, WidgetConfig, ClaudeCodeInput } from "../../src/types.ts";

/** Strip ANSI color codes for cleaner test assertions */
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]+m/g, "");
}

describe("GitWidget icon modes", () => {
  const mockInput: ClaudeCodeInput = {
    cwd: "/fake/dir",
  };

  const mockConfig: WidgetConfig = { enabled: true };

  it("should use nerd font icon by default", async () => {
    const mockGlobalConfig: Config = { iconMode: "nerdfont" };
    const widget = new GitWidget();

    // Verify default icon is nerd font
    expect(widget.defaultIcon).toBe("\u{f02a2}");
  });

  it("should select text icon when iconMode is 'text'", () => {
    const widget = new GitWidget();
    const mockGlobalConfig: Config = { iconMode: "text" };
    const mockConfig: WidgetConfig = {};

    const icon = widget.getIcon(mockConfig, mockGlobalConfig);
    expect(icon).toBe("g:");
  });

  it("should select emoji icon when iconMode is 'emoji'", () => {
    const widget = new GitWidget();
    const mockGlobalConfig: Config = { iconMode: "emoji" };
    const mockConfig: WidgetConfig = {};

    const icon = widget.getIcon(mockConfig, mockGlobalConfig);
    expect(icon).toBe("🌿");
  });

  it("should use custom icon if provided", () => {
    const widget = new GitWidget();
    const mockGlobalConfig: Config = { iconMode: "text" };
    const mockConfig: WidgetConfig = { icon: "CUSTOM>" };

    const icon = widget.getIcon(mockConfig, mockGlobalConfig);
    expect(icon).toBe("CUSTOM>");
  });
});

describe("GitWidget conditional spacing", () => {
  // Use a real git repo path for integration testing
  const mockInput: ClaudeCodeInput = {
    cwd: "/Users/hayhaydz/personal-coding/status-line-cc",
  };

  const mockGlobalConfig: Config = {
    iconMode: "text",
    theme: "monochrome",
  };

  const widgetConfig: WidgetConfig = {};

  it("should format text mode as 'g:main' (no space after label)", async () => {
    const widget = new GitWidget();
    const textConfig: Config = { ...mockGlobalConfig, iconMode: "text" };
    const result = await widget.render(mockInput, widgetConfig, textConfig);
    // Text mode: no space after label
    const stripped = stripAnsi(result);
    expect(stripped).toMatch(/^g:[\w-]/);
  });

  it("should format icon mode with space after icon", async () => {
    const widget = new GitWidget();
    const iconConfig: Config = { ...mockGlobalConfig, iconMode: "nerdfont" };
    const result = await widget.render(mockInput, widgetConfig, iconConfig);
    // Icon mode: space after icon
    const parts = stripAnsi(result).split(/[\w-]/);
    expect(parts[0]).toBe("\u{f02a2} ");
  });

  it("should format emoji mode with space after emoji", async () => {
    const widget = new GitWidget();
    const emojiConfig: Config = { ...mockGlobalConfig, iconMode: "emoji" };
    const result = await widget.render(mockInput, widgetConfig, emojiConfig);
    // Emoji mode: space after emoji
    const parts = stripAnsi(result).split(/[\w-]/);
    expect(parts[0]).toBe("🌿 ");
  });
});
