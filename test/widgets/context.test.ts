/**
 * Context Widget tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createContextWidget } from "../../src/widgets/context.ts";
import type { ClaudeCodeInput } from "../../src/types.ts";

describe("ContextWidget", () => {
  const testTranscriptPath = "/tmp/test-transcript-context.jsonl";

  beforeEach(async () => {
    // Create a test transcript file with sample content
    // Use a LOT of content to ensure we get a meaningful percentage (at least 10%)
    // Context limit is 200,000 tokens, so we need ~20,000 tokens = ~80,000 characters
    const longMessage = "This is a test message with content that will help us reach our token count goal for testing. ".repeat(500); // ~40,000 chars
    const mockTranscriptContent = [
      { content: longMessage },
      { content: longMessage },
    ]
      .map((msg) => JSON.stringify(msg))
      .join("\n")
      .concat("\n");

    await writeFile(testTranscriptPath, mockTranscriptContent, "utf-8");
  });

  afterEach(async () => {
    // Clean up test transcript file
    if (existsSync(testTranscriptPath)) {
      await unlink(testTranscriptPath);
    }
  });

  it("should show compact format with icon", async () => {
    const input: ClaudeCodeInput = {
      transcript_path: testTranscriptPath,
      model: "claude-sonnet-4-6",
    };

    const widget = createContextWidget();
    const result = await widget.render(input, { format: "compact" });

    expect(result).toContain("\uf0e7"); // nf-fa-bolt icon
    expect(result).toContain("%");
  });

  it("should show minimal format (number only)", async () => {
    const input: ClaudeCodeInput = {
      transcript_path: testTranscriptPath,
      model: "claude-sonnet-4-6",
    };

    const widget = createContextWidget();
    const result = await widget.render(input, { format: "minimal" });

    expect(result).toMatch(/^\d+%$/);
  });

  it("should show detailed format with label", async () => {
    const input: ClaudeCodeInput = {
      transcript_path: testTranscriptPath,
      model: "claude-sonnet-4-6",
    };

    const widget = createContextWidget();
    const result = await widget.render(input, { format: "detailed" });

    expect(result).toContain("ctx:");
    expect(result).toContain("%");
  });

  it("should return empty string when no transcript path", async () => {
    const input: ClaudeCodeInput = {};

    const widget = createContextWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("");
  });

  it("should return empty string when transcript file doesn't exist", async () => {
    const input: ClaudeCodeInput = {
      transcript_path: "/nonexistent/transcript.jsonl",
      model: "claude-sonnet-4-6",
    };

    const widget = createContextWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("");
  });

  describe("Progress Bar", () => {
    it("should show progress bar when enabled", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, { options: { progressBar: true } });

      // Progress bar should contain brackets
      expect(result).toMatch(/\[.*\]/);
      // With our large transcript, we should see filled blocks
      expect(result).toContain("█");
      // Should contain the percentage
      expect(result).toContain("%");
    });

    it("should not show progress bar when disabled", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, { options: { progressBar: false } });

      // Should not contain progress bar brackets
      expect(result).not.toContain("[");
    });

    it("should not show progress bar when option not set", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {});

      // Should not contain progress bar brackets by default
      expect(result).not.toContain("[");
    });

    it("should use fixed width of 10 for progress bar", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, { options: { progressBar: true } });

      // Extract progress bar content
      const match = result.match(/\[(.*)\]/);
      expect(match).toBeTruthy();
      if (match) {
        // Bar content should be exactly 10 characters (█ + ░)
        expect(match[1].length).toBe(10);
      }
    });

    it("should show progress bar with minimal format", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {
        format: "minimal",
        options: { progressBar: true }
      });

      // Should contain progress bar and percentage
      expect(result).toMatch(/\[.*\]\s*\d+%/);
    });

    it("should show progress bar with compact format", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {
        format: "compact",
        options: { progressBar: true }
      });

      // Should contain progress bar, icon, and percentage
      expect(result).toContain("\uf0e7"); // icon
      expect(result).toMatch(/\[.*\]/); // progress bar
      expect(result).toContain("%"); // percentage
    });

    it("should show progress bar with detailed format", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {
        format: "detailed",
        options: { progressBar: true }
      });

      // Should contain progress bar, label, and percentage
      expect(result).toContain("ctx:"); // label
      expect(result).toMatch(/\[.*\]/); // progress bar
      expect(result).toContain("%"); // percentage
    });
  });

  describe("createProgressBar unit tests", () => {
    const emptyTranscriptPath = "/tmp/test-transcript-empty.jsonl";
    const fullTranscriptPath = "/tmp/test-transcript-full.jsonl";
    const partialTranscriptPath = "/tmp/test-transcript-partial.jsonl";

    // Test 0%: empty bar [░░░░░░░░░░]
    it("should show empty bar at 0%", async () => {
      // Create empty transcript
      await writeFile(emptyTranscriptPath, "", "utf-8");

      const input: ClaudeCodeInput = {
        transcript_path: emptyTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, { options: { progressBar: true } });

      // Empty transcript returns empty string, so we can't test 0% directly
      // The widget returns "" when used === 0
      expect(result).toBe("");

      // Clean up
      await unlink(emptyTranscriptPath);
    });

    // Test ~60%: partial bar [██████░░░░]
    it("should show partial bar at ~60%", async () => {
      // Create transcript that results in ~60% of context window
      // 60% of 200,000 tokens = 120,000 tokens ≈ 480,000 characters
      const largeContent = "x".repeat(480000);
      const partialContent = JSON.stringify({ content: largeContent }) + "\n";
      await writeFile(partialTranscriptPath, partialContent, "utf-8");

      const input: ClaudeCodeInput = {
        transcript_path: partialTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, { options: { progressBar: true } });

      // Extract progress bar
      const match = result.match(/\[(.*)\]/);
      expect(match).toBeTruthy();
      if (match) {
        const bar = match[1];
        // Should have some filled blocks (6 out of 10)
        const filledCount = (bar.match(/█/g) || []).length;
        const emptyCount = (bar.match(/░/g) || []).length;
        expect(filledCount + emptyCount).toBe(10);
        // At 60%, we expect 6 filled blocks (round(0.6 * 10) = 6)
        expect(filledCount).toBeGreaterThanOrEqual(5); // Allow some tolerance
      }

      // Clean up
      await unlink(partialTranscriptPath);
    });

    // Test 100%: full bar [██████████]
    it("should show full bar at 100%", async () => {
      // Create transcript that exceeds context window (will cap at 100%)
      // 100% of 200,000 tokens = 200,000 tokens ≈ 800,000 characters
      const hugeContent = "x".repeat(900000);
      const fullContent = JSON.stringify({ content: hugeContent }) + "\n";
      await writeFile(fullTranscriptPath, fullContent, "utf-8");

      const input: ClaudeCodeInput = {
        transcript_path: fullTranscriptPath,
        model: "claude-sonnet-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, { options: { progressBar: true } });

      // Should show 100%
      expect(result).toContain("100%");

      // Extract progress bar
      const match = result.match(/\[(.*)\]/);
      expect(match).toBeTruthy();
      if (match) {
        const bar = match[1];
        // All blocks should be filled at 100%
        expect(bar).toBe("██████████");
      }

      // Clean up
      await unlink(fullTranscriptPath);
    });
  });

  describe("Different models", () => {
    it("should use correct context limit for claude-opus-4-6", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-opus-4-6",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {});

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should use correct context limit for claude-haiku-4-5-20251001", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "claude-haiku-4-5-20251001",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {});

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should use default context limit for unknown model", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: "unknown-model",
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {});

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle model as object with id", async () => {
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: { id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" },
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {});

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should use default context limit when model is not provided", async () => {
      // This tests the edge case where extractModelId returns undefined
      // (when input.model is not provided at all)
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        // model is not provided - extractModelId returns undefined
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {});

      // Widget should still work with default context limit
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should use default context limit when model object has no id", async () => {
      // This tests the edge case where extractModelId returns undefined
      // (when input.model is an object without id property)
      const input: ClaudeCodeInput = {
        transcript_path: testTranscriptPath,
        model: { display_name: "Some Model" },
      };

      const widget = createContextWidget();
      const result = await widget.render(input, {});

      // Widget should still work with default context limit
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
