import { describe, it, expect } from "bun:test";
import { GitWidget } from "../../src/widgets/git.ts";
import type { Config, WidgetConfig, ClaudeCodeInput } from "../../src/types.ts";

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
