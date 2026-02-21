import { describe, it, expect } from "bun:test";
import { ModelWidget } from "../../src/widgets/model.ts";
import type { Config, WidgetConfig } from "../../src/types.ts";

describe("ModelWidget icon modes", () => {
  it("should use nerd font icon by default", () => {
    const widget = new ModelWidget();
    expect(widget.defaultIcon).toBe("\u{e26d}");
  });

  it("should select text icon when iconMode is 'text'", () => {
    const widget = new ModelWidget();
    const mockGlobalConfig: Config = { iconMode: "text" };
    const icon = widget.getIcon({}, mockGlobalConfig);
    expect(icon).toBe("model:");
  });

  it("should select emoji icon when iconMode is 'emoji'", () => {
    const widget = new ModelWidget();
    const mockGlobalConfig: Config = { iconMode: "emoji" };
    const icon = widget.getIcon({}, mockGlobalConfig);
    expect(icon).toBe("🤖");
  });
});
