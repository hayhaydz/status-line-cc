/**
 * Cached Tokens Widget tests
 */

import { describe, it, expect } from "bun:test";
import { CacheWidget } from "../../src/widgets/cache.ts";
import type { ClaudeCodeInput } from "../../src/types.ts";

describe("CacheWidget", () => {
  it("should show total cached tokens when available", async () => {
    const input: ClaudeCodeInput = {
      context_window: {
        total_input_tokens: 10000,
        total_output_tokens: 2000,
        context_window_size: 200000,
        used_percentage: 5,
        remaining_percentage: 95,
        current_usage: {
          input_tokens: 5000,
          output_tokens: 1000,
          cache_creation_input_tokens: 3000,
          cache_read_input_tokens: 2000,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, {});

    expect(result).toContain("5.0k");
  });

  it("should return empty string when no cache data", async () => {
    const input: ClaudeCodeInput = {};

    const widget = new CacheWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("");
  });

  it("should format tokens without decimal when < 1000", async () => {
    const input: ClaudeCodeInput = {
      context_window: {
        current_usage: {
          cache_creation_input_tokens: 500,
          cache_read_input_tokens: 200,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, {});

    expect(result).toContain("700");
  });

  it("should show minimal format (number only)", async () => {
    const input: ClaudeCodeInput = {
      context_window: {
        current_usage: {
          cache_creation_input_tokens: 3000,
          cache_read_input_tokens: 2000,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, { format: "minimal" });

    expect(result).toBe("5.0k");
  });

  it("should show compact format with icon", async () => {
    const input: ClaudeCodeInput = {
      context_window: {
        current_usage: {
          cache_creation_input_tokens: 3000,
          cache_read_input_tokens: 2000,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, { format: "compact" });

    expect(result).toContain("\uf47a"); // nf-mdi-cache icon
    expect(result).toContain("5.0k");
  });
});
