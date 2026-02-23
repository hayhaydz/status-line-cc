/**
 * Web Search Limit Widget tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { WebSearchWidget } from "../../src/widgets/websearch.ts";
import type { ClaudeCodeInput, Config, WidgetConfig } from "../../src/types.ts";
import { clearAll as clearCache } from "../../src/util/cache.ts";

/** Strip ANSI color codes for cleaner test assertions */
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]+m/g, "");
}

describe("WebSearchWidget", () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof createMockFetch>;

  function createMockFetch() {
    let mockResponse: Response | null = null;
    let mockError: Error | null = null;

    const fetchMock = async (): Promise<Response> => {
      if (mockError) throw mockError;
      if (mockResponse) return mockResponse;
      throw new Error("No mock response set");
    };

    return {
      fetch: fetchMock as unknown as typeof fetch,
      setResponse: (response: Response) => { mockResponse = response; },
      setError: (error: Error) => { mockError = error; },
      reset: () => { mockResponse = null; mockError = null; },
    };
  }

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = createMockFetch();
    globalThis.fetch = mockFetch.fetch as typeof globalThis.fetch;
    // Clear cache before each test
    clearCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCache();
  });

  it("should show web search percentage when available", async () => {
    // Mock the GLM API response with MCP usage data
    const mockData = {
      code: 0,
      success: true,
      msg: "ok",
      data: {
        limits: [
          {
            type: "MCP usage(1 Month)",
            percentage: 25,
            currentUsage: 250,
            totol: 1000,
            usageDetails: [
              { modelCode: "search-prime", usage: 100 },
              { modelCode: "web-reader", usage: 150 },
            ],
          },
        ],
      },
    };

    mockFetch.setResponse({
      ok: true,
      json: async () => mockData,
    } as Response);

    const widget = new WebSearchWidget();
    const input: ClaudeCodeInput = {};
    const config: Config = {
      glm: {
        baseUrl: "https://api.z.ai/api/anthropic",
        authToken: "test-token",
      },
    };

    const result = await widget.render(input, {}, config);

    expect(result).toContain("25%");
  });

  it("should show detailed format with count", async () => {
    const mockData = {
      code: 0,
      success: true,
      msg: "ok",
      data: {
        limits: [
          {
            type: "MCP usage(1 Month)",
            percentage: 42,
            currentUsage: 420,
            totol: 1000,
          },
        ],
      },
    };

    mockFetch.setResponse({
      ok: true,
      json: async () => mockData,
    } as Response);

    const widget = new WebSearchWidget();
    const input: ClaudeCodeInput = {};
    const config: Config = {
      glm: {
        authToken: "test-token",
      },
    };

    const result = await widget.render(input, { format: "detailed" }, config);

    expect(result).toContain("42%");
    expect(result).toContain("420");
    expect(result).toContain("1000");
  });

  it("should return empty string when no MCP limit found", async () => {
    const mockData = {
      code: 0,
      success: true,
      msg: "ok",
      data: {
        limits: [
          {
            type: "Token usage(5 Hour)",
            percentage: 17,
          },
        ],
      },
    };

    mockFetch.setResponse({
      ok: true,
      json: async () => mockData,
    } as Response);

    const widget = new WebSearchWidget();
    const input: ClaudeCodeInput = {};
    const config: Config = {
      glm: {
        authToken: "test-token",
      },
    };

    const result = await widget.render(input, {}, config);

    expect(result).toBe("");
  });

  it("should return empty string when no auth token", async () => {
    const widget = new WebSearchWidget();
    const input: ClaudeCodeInput = {};
    const config: Config = {};

    const result = await widget.render(input, {}, config);

    expect(result).toBe("");
  });

  it("should show minimal format (percentage only)", async () => {
    const mockData = {
      code: 0,
      success: true,
      msg: "ok",
      data: {
        limits: [
          {
            type: "MCP usage(1 Month)",
            percentage: 75,
            currentUsage: 750,
            totol: 1000,
          },
        ],
      },
    };

    mockFetch.setResponse({
      ok: true,
      json: async () => mockData,
    } as Response);

    const widget = new WebSearchWidget();
    const input: ClaudeCodeInput = {};
    const config: Config = {
      glm: {
        authToken: "test-token",
      },
    };

    const result = await widget.render(input, { format: "minimal" }, config);

    expect(result).toBe("75%");
  });

  it("should show compact format with icon", async () => {
    const mockData = {
      code: 0,
      success: true,
      msg: "ok",
      data: {
        limits: [
          {
            type: "MCP usage(1 Month)",
            percentage: 33,
            currentUsage: 330,
            totol: 1000,
          },
        ],
      },
    };

    mockFetch.setResponse({
      ok: true,
      json: async () => mockData,
    } as Response);

    const widget = new WebSearchWidget();
    const input: ClaudeCodeInput = {};
    const config: Config = {
      glm: {
        authToken: "test-token",
      },
    };

    const result = await widget.render(input, { format: "compact" }, config);

    expect(result).toContain("\uf0ac"); // nf-fa-globe icon
    expect(result).toContain("33%");
  });

  it("should return empty string on API error", async () => {
    mockFetch.setResponse({
      ok: false,
      status: 500,
    } as Response);

    const widget = new WebSearchWidget();
    const input: ClaudeCodeInput = {};
    const config: Config = {
      glm: {
        authToken: "test-token",
      },
    };

    const result = await widget.render(input, {}, config);

    expect(result).toBe("");
  });

  it("should use custom icon when provided", async () => {
    const mockData = {
      code: 0,
      success: true,
      msg: "ok",
      data: {
        limits: [
          {
            type: "MCP usage(1 Month)",
            percentage: 50,
            currentUsage: 500,
            totol: 1000,
          },
        ],
      },
    };

    mockFetch.setResponse({
      ok: true,
      json: async () => mockData,
    } as Response);

    const widget = new WebSearchWidget();
    const input: ClaudeCodeInput = {};
    const config: Config = {
      glm: {
        authToken: "test-token",
      },
    };

    const result = await widget.render(input, { icon: "\uf015" }, config); // nf-fa-home

    expect(result).toContain("\uf015");
  });

  describe("Conditional spacing (Task 8)", () => {
    const mockData = {
      code: 0,
      success: true,
      msg: "ok",
      data: {
        limits: [
          {
            type: "MCP usage(1 Month)",
            percentage: 1,
            currentUsage: 10,
            totol: 1000,
          },
        ],
      },
    };

    const mockInput: ClaudeCodeInput = {};
    const mockBaseConfig: Config = {
      glm: {
        authToken: "test-token",
      },
      theme: "monochrome",
    };

    beforeEach(() => {
      mockFetch.setResponse({
        ok: true,
        json: async () => mockData,
      } as Response);
    });

    it("should format text mode as 'w:1%' (no space after label)", async () => {
      const widget = new WebSearchWidget();
      const textConfig: Config = { ...mockBaseConfig, iconMode: "text" };
      const widgetConfig: WidgetConfig = {};

      const result = await widget.render(mockInput, widgetConfig, textConfig);

      expect(stripAnsi(result)).toBe("w:1%");
    });

    it("should format icon mode with space after icon", async () => {
      const widget = new WebSearchWidget();
      const iconConfig: Config = { ...mockBaseConfig, iconMode: "nerdfont" };
      const widgetConfig: WidgetConfig = {};

      const result = await widget.render(mockInput, widgetConfig, iconConfig);

      // Should have space after the nerd font icon
      expect(stripAnsi(result)).toMatch(/\uf0ac 1%/);
    });

    it("should use 'w:' label in text mode (not 'web:')", async () => {
      const widget = new WebSearchWidget();
      const textConfig: Config = { ...mockBaseConfig, iconMode: "text" };
      const widgetConfig: WidgetConfig = {};

      const result = await widget.render(mockInput, widgetConfig, textConfig);

      // Should use shortened label
      expect(stripAnsi(result)).toContain("w:");
      // Should NOT use old longer label
      expect(stripAnsi(result)).not.toContain("web:");
    });
  });
});
