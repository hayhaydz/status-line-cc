import { describe, it, expect } from "bun:test";
import { color256, color16, color, RESET, visibleLength } from "../../src/util/ansi.ts";

describe("ANSI color utilities", () => {
  describe("RESET", () => {
    it("should export the ANSI reset code", () => {
      expect(RESET).toBe("\x1b[0m");
    });
  });

  describe("color256", () => {
    it("should wrap text with 256-color ANSI codes", () => {
      const result = color256("test", 109);
      expect(result).toContain("\x1b[38;5;109m");
      expect(result).toContain("test");
      expect(result).toContain("\x1b[0m");
    });

    it("should handle color code 0", () => {
      const result = color256("black", 0);
      expect(result).toBe("\x1b[38;5;0mblack\x1b[0m");
    });

    it("should handle color code 255", () => {
      const result = color256("white", 255);
      expect(result).toBe("\x1b[38;5;255mwhite\x1b[0m");
    });

    it("should handle empty string", () => {
      const result = color256("", 100);
      expect(result).toBe("\x1b[38;5;100m\x1b[0m");
    });
  });

  describe("color16", () => {
    it("should wrap text with 16-color ANSI codes for standard colors (0-7)", () => {
      const result = color16("test", 2); // Green
      expect(result).toBe("\x1b[32mtest\x1b[0m");
    });

    it("should wrap text with 16-color ANSI codes for bright colors (8-15)", () => {
      const result = color16("test", 9); // Bright red
      expect(result).toBe("\x1b[91mtest\x1b[0m");
    });

    it("should handle color 0 (black)", () => {
      const result = color16("black", 0);
      expect(result).toBe("\x1b[30mblack\x1b[0m");
    });

    it("should handle color 7 (white)", () => {
      const result = color16("white", 7);
      expect(result).toBe("\x1b[37mwhite\x1b[0m");
    });

    it("should handle bright color 15 (bright white)", () => {
      const result = color16("bright", 15);
      expect(result).toBe("\x1b[97mbright\x1b[0m");
    });
  });

  describe("color", () => {
    it("should use 256-color mode by default", () => {
      const result = color("test", 109);
      expect(result).toBe("\x1b[38;5;109mtest\x1b[0m");
    });

    it("should use 256-color mode when explicitly specified", () => {
      const result = color("test", 109, "256");
      expect(result).toBe("\x1b[38;5;109mtest\x1b[0m");
    });

    it("should use 16-color mode when specified", () => {
      const result = color("test", 2, "16");
      expect(result).toBe("\x1b[32mtest\x1b[0m");
    });

    it("should handle empty string", () => {
      const result = color("", 100);
      expect(result).toBe("\x1b[38;5;100m\x1b[0m");
    });
  });

  describe("visibleLength", () => {
    it("should count visible characters only", () => {
      const text = "\x1b[38;5;109mhello\x1b[0m";
      expect(visibleLength(text)).toBe(5);
    });

    it("should handle plain text without ANSI codes", () => {
      const text = "hello";
      expect(visibleLength(text)).toBe(5);
    });

    it("should handle empty string", () => {
      expect(visibleLength("")).toBe(0);
    });

    it("should handle text with multiple ANSI codes", () => {
      const text = "\x1b[31mX\x1b[32mhello\x1b[0m";
      expect(visibleLength(text)).toBe(6);
    });

    it("should handle text with ANSI codes in the middle", () => {
      const text = "hel\x1b[31mlo\x1b[0m";
      expect(visibleLength(text)).toBe(5);
    });

    it("should handle text with complex ANSI codes", () => {
      const text = "\x1b[38;5;109m\x1b[1mbold\x1b[0m";
      expect(visibleLength(text)).toBe(4);
    });

    it("should handle multi-byte characters correctly", () => {
      const text = "\x1b[31mこんにちは\x1b[0m";
      // In JavaScript, length counts code units, not graphemes
      expect(visibleLength(text)).toBe(5);
    });

    it("should handle mixed content", () => {
      const text = "\x1b[38;5;109mHello\x1b[0m \x1b[38;5;202mWorld\x1b[0m";
      expect(visibleLength(text)).toBe(11);
    });

    it("should handle icon characters", () => {
      const text = "\x1b[38;5;109m⚡\x1b[0m";
      expect(visibleLength(text)).toBe(1);
    });
  });
});
