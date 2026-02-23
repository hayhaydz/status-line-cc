/**
 * GLM Widget tests
 */

import { describe, it, expect, mock } from "bun:test";
import { GLMWidget } from "../../src/widgets/glm.ts";
import type { ClaudeCodeInput } from "../../src/types.ts";

// Mock the GLM API module
const mockGLMAPI = mock(() => Promise.resolve({
  limits: [
    { type: "TOKENS_LIMIT", percentage: 42, currentUsage: 42000, totol: 100000 },
    { type: "TIME_LIMIT", percentage: 15, currentUsage: 900, totol: 3600 },
  ],
  level: "PLUS",
}));

// Mock the cache module to return our mock data
mock.module("../../src/util/glm-api.ts", () => ({
  getGLMQuota: mockGLMAPI,
  fetchGLMQuota: mockGLMAPI,
}));

describe("GLMWidget", () => {
  it("should show quota percentage with icon", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new GLMWidget();
    const result = await widget.render(input, { format: "compact" });

    expect(result).toContain("\u{f0a9e}"); // nf-mdi-chart_bar icon
    expect(result).toContain("42%"); // Should show percentage
  });

  it("should show minimal format", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new GLMWidget();
    const result = await widget.render(input, { format: "minimal" });

    expect(result).toMatch(/\d+%/); // Should show like "42%"
  });

  it("should show detailed format with icon", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new GLMWidget();
    const result = await widget.render(input, { format: "detailed" });

    expect(result).toContain("\u{f0a9e}"); // Should show Nerd Font icon in detailed mode
    expect(result).toContain("42%"); // Should show percentage
  });

  it("should show text icon in text mode", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new GLMWidget();
    const result = await widget.render(input, { format: "compact" }, { iconMode: "text" });

    expect(result).toContain("q:"); // Should show "q:" label
  });

  it("should show emoji icon in emoji mode", async () => {
    const input: ClaudeCodeInput = {};
    const widget = new GLMWidget();
    const result = await widget.render(input, { format: "compact" }, { iconMode: "emoji" });

    expect(result).toContain("📊"); // Should show bar chart emoji
  });
});
