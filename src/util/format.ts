/**
 * Format utility for status line output
 *
 * Simple joiner for widget values with " | " separator.
 */

/**
 * Format widget outputs into final status line
 *
 * Joins non-empty, non-null values with " | " separator.
 * Filters out null and empty string values.
 *
 * @param values - Array of widget outputs (string, null, or empty)
 * @returns Joined status line string
 */
export function formatOutput(values: (string | null)[]): string {
  return values.filter(v => v !== null && v !== "").join(" | ");
}
