/**
 * Main entry point tests
 *
 * Tests for output format parsing and multi-line rendering.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { parseOutputFormat } from "../src/main.ts";
import type { ClaudeCodeInput, OutputFormat } from "../src/types.ts";

describe("parseOutputFormat", () => {
  it("should return compact format for no input", () => {
    const input: ClaudeCodeInput = {};
    const result = parseOutputFormat(input);
    expect(result).toEqual({ format: "compact", separator: " | " });
  });

  it("should return compact format for compact output_style", () => {
    const input: ClaudeCodeInput = { output_style: { name: "compact" } };
    const result = parseOutputFormat(input);
    expect(result).toEqual({ format: "compact", separator: " | " });
  });

  it("should return detailed format for detailed output_style", () => {
    const input: ClaudeCodeInput = { output_style: { name: "detailed" } };
    const result = parseOutputFormat(input);
    expect(result).toEqual({ format: "detailed", separator: " | " });
  });

  it("should return minimal format for minimal output_style", () => {
    const input: ClaudeCodeInput = { output_style: { name: "minimal" } };
    const result = parseOutputFormat(input);
    expect(result).toEqual({ format: "minimal", separator: " | " });
  });

  it("should return detailed format with newline separator for multiline output_style", () => {
    const input: ClaudeCodeInput = { output_style: { name: "multiline" } };
    const result = parseOutputFormat(input);
    expect(result).toEqual({ format: "detailed", separator: "\n" });
  });

  it("should use config format when no output_style provided", () => {
    const input: ClaudeCodeInput = {};
    const result = parseOutputFormat(input, "detailed");
    expect(result).toEqual({ format: "detailed", separator: " | " });
  });

  it("should prefer output_style over config format", () => {
    const input: ClaudeCodeInput = { output_style: { name: "minimal" } };
    const result = parseOutputFormat(input, "detailed");
    expect(result).toEqual({ format: "minimal", separator: " | " });
  });

  it("should handle case-insensitive output_style names", () => {
    const input: ClaudeCodeInput = { output_style: { name: "MULTILINE" } };
    const result = parseOutputFormat(input);
    expect(result).toEqual({ format: "detailed", separator: "\n" });
  });

  it("should default to compact for unknown output_style", () => {
    const input: ClaudeCodeInput = { output_style: { name: "unknown" } };
    const result = parseOutputFormat(input);
    expect(result).toEqual({ format: "compact", separator: " | " });
  });
});

describe("Multi-line rendering behavior", () => {
  it("should contain newline when multiline format is used", () => {
    const input: ClaudeCodeInput = { output_style: { name: "multiline" } };
    const result = parseOutputFormat(input);
    expect(result.separator).toContain("\n");
  });

  it("should use detailed format for multiline output", () => {
    const input: ClaudeCodeInput = { output_style: { name: "multiline" } };
    const result = parseOutputFormat(input);
    expect(result.format).toBe("detailed");
  });

  it("should not contain newline for standard formats", () => {
    const inputCompact: ClaudeCodeInput = { output_style: { name: "compact" } };
    const resultCompact = parseOutputFormat(inputCompact);
    expect(resultCompact.separator).not.toContain("\n");

    const inputDetailed: ClaudeCodeInput = { output_style: { name: "detailed" } };
    const resultDetailed = parseOutputFormat(inputDetailed);
    expect(resultDetailed.separator).not.toContain("\n");

    const inputMinimal: ClaudeCodeInput = { output_style: { name: "minimal" } };
    const resultMinimal = parseOutputFormat(inputMinimal);
    expect(resultMinimal.separator).not.toContain("\n");
  });
});
