/**
 * Cached Tokens Widget tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { CacheWidget } from "../../src/widgets/cache.ts";
import type { ClaudeCodeInput } from "../../src/types.ts";
import { unlinkSync, existsSync, writeFileSync } from "node:fs";

// Use /tmp directly for consistency with the widget implementation
const STATE_FILE = "/tmp/claude-sl-cache-state.txt";

describe("CacheWidget", () => {

  beforeEach(() => {
    // Clean up state file before each test
    if (existsSync(STATE_FILE)) {
      unlinkSync(STATE_FILE);
    }
  });

  afterEach(() => {
    // Clean up state file after each test
    if (existsSync(STATE_FILE)) {
      unlinkSync(STATE_FILE);
    }
  });

  it("should show cache as percentage of 200k limit", async () => {
    // 5000 cached tokens = 2.5% of 200k
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

    expect(result).toContain("3%"); // 5000/200000 = 2.5% -> rounds to 3%
  });

  it("should show 0% when no cache data (no history)", async () => {
    // No context_window at all, no previous state
    const input: ClaudeCodeInput = {};

    const widget = new CacheWidget();
    const result = await widget.render(input, {});

    // Should show 0% instead of empty string (new behavior)
    expect(result).toContain("0%");
  });

  it("should show 0% when cache is 0", async () => {
    const input: ClaudeCodeInput = {
      context_window: {
        current_usage: {
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, {});

    expect(result).toContain("0%");
  });

  it("should cap at 100% for large caches", async () => {
    // 250k cached tokens = 125% of 200k, should cap at 100%
    const input: ClaudeCodeInput = {
      context_window: {
        current_usage: {
          cache_creation_input_tokens: 150000,
          cache_read_input_tokens: 100000,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, {});

    expect(result).toContain("100%");
  });

  it("should show minimal format (percentage only)", async () => {
    // 100k cached = 50% of 200k
    const input: ClaudeCodeInput = {
      context_window: {
        current_usage: {
          cache_creation_input_tokens: 50000,
          cache_read_input_tokens: 50000,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, { format: "minimal" });

    expect(result).toBe("50%");
  });

  it("should show compact format with icon and space", async () => {
    // 1% cached = 2k of 200k
    const input: ClaudeCodeInput = {
      context_window: {
        context_window_size: 200000,
        current_usage: {
          cache_read_input_tokens: 2000,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, { format: "compact" }, { iconMode: "nerdfont" });

    // Icon with space before value
    expect(result).toBe("\uf47a 1%"); // nf-mdi-cache icon
  });

  it("should show text mode with short label and no space", async () => {
    // 1% cached = 2k of 200k
    const input: ClaudeCodeInput = {
      context_window: {
        context_window_size: 200000,
        current_usage: {
          cache_read_input_tokens: 2000,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, { format: "compact" }, { iconMode: "text" });

    // Short label "c:" with no space before value
    expect(result).toBe("c:1%");
  });

  it("should show emoji mode", async () => {
    const input: ClaudeCodeInput = {
      context_window: {
        current_usage: {
          cache_read_input_tokens: 40000,
        },
      },
    };

    const widget = new CacheWidget();
    const result = await widget.render(input, { format: "compact" }, { iconMode: "emoji" });

    expect(result).toContain("💾");
    expect(result).toContain("20%");
  });

  it("should remember last known value when data is missing", async () => {
    // First call with data - should save state
    const inputWithData: ClaudeCodeInput = {
      context_window: {
        context_window_size: 200000,
        current_usage: {
          cache_read_input_tokens: 60000, // 30%
        },
      },
    };

    const widget = new CacheWidget();
    await widget.render(inputWithData, {});

    // Second call without data - should use saved state
    const inputWithoutData: ClaudeCodeInput = {};
    const result = await widget.render(inputWithoutData, {});

    expect(result).toContain("30%");
  });

  it("should update saved state when new data arrives", async () => {
    const widget = new CacheWidget();

    // First call: 20%
    const input1: ClaudeCodeInput = {
      context_window: {
        context_window_size: 200000,
        current_usage: {
          cache_read_input_tokens: 40000,
        },
      },
    };
    await widget.render(input1, {});

    // Second call: 50%
    const input2: ClaudeCodeInput = {
      context_window: {
        context_window_size: 200000,
        current_usage: {
          cache_read_input_tokens: 100000,
        },
      },
    };
    await widget.render(input2, {});

    // Third call without data should show 50%
    const input3: ClaudeCodeInput = {};
    const result = await widget.render(input3, {});

    expect(result).toContain("50%");
  });
});
