/**
 * Context Widget tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { ContextWidget } from "../../src/widgets/context.ts";
import type { ClaudeCodeInput } from "../../src/types.ts";

describe("ContextWidget", () => {
  const testTranscriptPath = "/tmp/test-transcript-context.jsonl";

  // Create a mock transcript with assistant message containing usage data
  const createMockTranscript = (inputTokens: number, cacheReadTokens = 0, outputTokens = 100) => {
    const mockTranscript = [
      { type: "user", message: { content: "Hello" } },
      {
        type: "assistant",
        message: {
          content: [{ type: "text", text: "Response" }],
          usage: {
            input_tokens: inputTokens,
            cache_read_input_tokens: cacheReadTokens,
            output_tokens: outputTokens,
          }
        }
      }
    ];
    return mockTranscript.map(msg => JSON.stringify(msg)).join("\n") + "\n";
  };

  beforeEach(async () => {
    const mockContent = createMockTranscript(10000, 50000, 200);
    await writeFile(testTranscriptPath, mockContent, "utf-8");
  });

  afterEach(async () => {
    if (existsSync(testTranscriptPath)) {
      await unlink(testTranscriptPath);
    }
  });

  it("should show token format with used/total", async () => {
    const input: ClaudeCodeInput = {
      transcript_path: testTranscriptPath,
      model: "claude-sonnet-4-6",
    };

    const widget = new ContextWidget();
    const result = await widget.render(input, {});

    expect(result).toContain("k");
    expect(result).toContain("/");
    expect(result).toContain("200k");
  });

  it("should return null when no transcript path", async () => {
    const input: ClaudeCodeInput = {};

    const widget = new ContextWidget();
    const result = await widget.render(input, {});

    expect(result).toBeNull();
  });

  it("should return null when transcript file doesn't exist", async () => {
    const input: ClaudeCodeInput = {
      transcript_path: "/nonexistent/transcript.jsonl",
      model: "claude-sonnet-4-6",
    };

    const widget = new ContextWidget();
    const result = await widget.render(input, {});

    expect(result).toBeNull();
  });

  it("should return null when no assistant message with usage", async () => {
    const noUsageTranscript = [
      { type: "user", message: { content: "Hello" } },
    ].map(msg => JSON.stringify(msg)).join("\n") + "\n";

    const noUsagePath = "/tmp/test-transcript-no-usage.jsonl";
    await writeFile(noUsagePath, noUsageTranscript, "utf-8");

    const input: ClaudeCodeInput = {
      transcript_path: noUsagePath,
      model: "claude-sonnet-4-6",
    };

    const widget = new ContextWidget();
    const result = await widget.render(input, {});

    expect(result).toBeNull();

    await unlink(noUsagePath);
  });

  it("should use the last assistant message for token count", async () => {
    const multiTranscript = [
      { type: "user", message: { content: "Hello" } },
      {
        type: "assistant",
        message: {
          content: [{ type: "text", text: "First" }],
          usage: { input_tokens: 1000, cache_read_input_tokens: 0, output_tokens: 50 }
        }
      },
      { type: "user", message: { content: "More" } },
      {
        type: "assistant",
        message: {
          content: [{ type: "text", text: "Second" }],
          usage: { input_tokens: 5000, cache_read_input_tokens: 20000, output_tokens: 100 }
        }
      }
    ].map(msg => JSON.stringify(msg)).join("\n") + "\n";

    const multiPath = "/tmp/test-transcript-multi.jsonl";
    await writeFile(multiPath, multiTranscript, "utf-8");

    const input: ClaudeCodeInput = {
      transcript_path: multiPath,
      model: "claude-sonnet-4-6",
    };

    const widget = new ContextWidget();
    const result = await widget.render(input, {});

    // Should use last message: 5000 + 20000 = 25000 = 25k
    expect(result).toContain("25k");

    await unlink(multiPath);
  });

  describe("Token formatting", () => {
    it("should format small numbers without k suffix", async () => {
      const smallTranscript = createMockTranscript(500, 0, 50);
      const smallPath = "/tmp/test-transcript-small.jsonl";
      await writeFile(smallPath, smallTranscript, "utf-8");

      const input: ClaudeCodeInput = {
        transcript_path: smallPath,
        model: "claude-sonnet-4-6",
      };

      const widget = new ContextWidget();
      const result = await widget.render(input, {});

      expect(result).toContain("500/");

      await unlink(smallPath);
    });

    it("should format thousands with k suffix", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = new ContextWidget();
      const result = await widget.render(input, {});

      expect(result).toContain("60k");
    });

    it("should format with decimal for fractional thousands", async () => {
      const decimalTranscript = createMockTranscript(500, 10000, 100);
      const decimalPath = "/tmp/test-transcript-decimal.jsonl";
      await writeFile(decimalPath, decimalTranscript, "utf-8");

      const input: ClaudeCodeInput = {
        transcript_path: decimalPath,
        model: "claude-sonnet-4-6",
      };

      const widget = new ContextWidget();
      const result = await widget.render(input, {});

      expect(result).toContain("10.5k");

      await unlink(decimalPath);
    });
  });

  describe("Different models", () => {
    it("should use correct context limit for claude-opus-4-6", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-opus-4-6",
      };

      const widget = new ContextWidget();
      const result = await widget.render(input, {});

      expect(result).toBeTruthy();
      expect(result).toContain("200k");
    });

    it("should use correct context limit for glm-4.7", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "glm-4.7",
      };

      const widget = new ContextWidget();
      const result = await widget.render(input, {});

      expect(result).toBeTruthy();
      expect(result).toContain("200k");
    });

    it("should use default context limit for unknown model", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "unknown-model",
      };

      const widget = new ContextWidget();
      const result = await widget.render(input, {});

      expect(result).toBeTruthy();
      expect(result!.length).toBeGreaterThan(0);
    });

    it("should handle model as object with id", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: { id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" },
      };

      const widget = new ContextWidget();
      const result = await widget.render(input, {});

      expect(result).toBeTruthy();
      expect(result!.length).toBeGreaterThan(0);
    });

    it("should use default context limit when model is not provided", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
      };

      const widget = new ContextWidget();
      const result = await widget.render(input, {});

      expect(result).toBeTruthy();
      expect(result!.length).toBeGreaterThan(0);
    });
  });
});
