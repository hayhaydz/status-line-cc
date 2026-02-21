/**
 * ANSI Color Utilities
 *
 * Provides functions for coloring terminal output using ANSI escape codes.
 * Supports both 16-color (standard) and 256-color (extended) palettes.
 */

const CSI = "\x1b[";

/**
 * ANSI reset code to clear all formatting
 */
export const RESET = `${CSI}0m`;

/**
 * Color text using 256-color palette
 * @param text - The text to color
 * @param code - The 256-color code (0-255)
 * @returns Text wrapped in ANSI color codes
 */
export function color256(text: string, code: number): string {
  return `${CSI}38;5;${code}m${text}${RESET}`;
}

/**
 * Color text using 16-color palette
 * @param text - The text to color
 * @param code - The 16-color code (0-15)
 * @returns Text wrapped in ANSI color codes
 */
export function color16(text: string, code: number): string {
  const colorCode = code < 8 ? 30 + code : 90 + (code - 8);
  return `${CSI}${colorCode}m${text}${RESET}`;
}

/**
 * Color text using either 16 or 256-color palette
 * @param text - The text to color
 * @param code - The color code
 * @param level - The color level: "16" or "256" (default)
 * @returns Text wrapped in ANSI color codes
 */
export function color(text: string, code: number, level: "16" | "256" = "256"): string {
  return level === "256" ? color256(text, code) : color16(text, code);
}

/**
 * Calculate the visible length of text, excluding ANSI escape codes
 * @param text - Text that may contain ANSI codes
 * @returns The number of visible characters
 */
export function visibleLength(text: string): number {
  const ansiRegex = /\x1b\[[0-9;]*m/g;
  return text.replace(ansiRegex, "").length;
}
