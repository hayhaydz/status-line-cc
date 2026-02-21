import { describe, it, expect, beforeAll } from "bun:test";
import { renderWidgets, registerWidget } from "../../src/widget.ts";
import { GitWidget } from "../../src/widgets/git.ts";
import { ModelWidget } from "../../src/widgets/model.ts";
import { ConcurrencyWidget } from "../../src/widgets/concurrency.ts";
import { ContextWidget } from "../../src/widgets/context.ts";
import { BlockWidget } from "../../src/widgets/block.ts";
import { GLMWidget } from "../../src/widgets/glm.ts";
import { CacheWidget } from "../../src/widgets/cache.ts";
import { WebSearchWidget } from "../../src/widgets/websearch.ts";
import type { ClaudeCodeInput, Config } from "../../src/types.ts";

// Import themes to ensure they're registered
import "../../src/themes/index.js";
import "../../src/themes/nord.js";
import "../../src/themes/tokyonight.js";
import "../../src/themes/monochrome.js";

describe("Icon mode integration", () => {
  const mockInput: ClaudeCodeInput = {
    cwd: "/fake/repo",
    model: "glm-5",
  };

  beforeAll(() => {
    // Register all widgets manually for testing
    registerWidget(new GitWidget());
    registerWidget(new ModelWidget());
    registerWidget(new ConcurrencyWidget());
    registerWidget(new ContextWidget());
    registerWidget(new BlockWidget());
    registerWidget(new GLMWidget());
    registerWidget(new CacheWidget());
    registerWidget(new WebSearchWidget());
  });

  it("should render with nerd font icons by default", async () => {
    const config: Config = { iconMode: "nerdfont", theme: "monochrome", widgets: {} };
    const output = await renderWidgets(mockInput, {}, "compact", " | ", config);
    expect(output).toContain("\u{e26d}"); // model nerd font
  });

  it("should render with text icons when configured", async () => {
    const config: Config = { iconMode: "text", theme: "monochrome", widgets: {} };
    const output = await renderWidgets(mockInput, {}, "compact", " | ", config);
    expect(output).toContain("model:");
  });

  it("should render with emoji icons when configured", async () => {
    const config: Config = { iconMode: "emoji", theme: "monochrome", widgets: {} };
    const output = await renderWidgets(mockInput, {}, "compact", " | ", config);
    expect(output).toContain("🤖");
  });
});

describe("Theme integration", () => {
  const mockInput: ClaudeCodeInput = {
    cwd: "/fake/repo",
    model: "glm-5",
  };

  beforeAll(() => {
    // Register all widgets manually for testing
    registerWidget(new GitWidget());
    registerWidget(new ModelWidget());
    registerWidget(new ConcurrencyWidget());
    registerWidget(new ContextWidget());
    registerWidget(new BlockWidget());
    registerWidget(new GLMWidget());
    registerWidget(new CacheWidget());
    registerWidget(new WebSearchWidget());
  });

  it("should apply nord theme colors", async () => {
    const config: Config = { iconMode: "text", theme: "nord", widgets: {} };
    const output = await renderWidgets(mockInput, {}, "compact", " | ", config);
    expect(output).toContain("\x1b["); // ANSI codes
  });

  it("should not apply colors in monochrome theme", async () => {
    const config: Config = { iconMode: "text", theme: "monochrome", widgets: {} };
    const output = await renderWidgets(mockInput, {}, "compact", " | ", config);
    expect(output).not.toContain("\x1b[");
  });
});
