/**
 * Format utility for widgets
 *
 * Provides standardized formatting functions for widget output.
 * Eliminates duplication across multiple widgets.
 */

import type { WidgetConfig } from "../types.js";

/**
 * Label options for formatWidgetValue
 */
export interface LabelOptions {
  /** Short label (used in compact mode) */
  short: string;
  /** Long label (used in detailed mode) */
  long: string;
}

/**
 * Format widget value with labels
 *
 * Formats output based on the configured format:
 * - minimal: value only (e.g., "50%")
 * - compact: icon + short label + value (e.g., "\uf017blk:50%")
 * - detailed: icon + long label + value (e.g., "\uf017block:50%")
 *
 * If labels are empty strings, only icon and value are used.
 *
 * @param value - The formatted value string (e.g., "50%", "2h15m")
 * @param icon - Widget icon (e.g., "\uf017")
 * @param config - Widget configuration with format option
 * @param labels - Label options for short/long variants
 * @returns Formatted string
 */
export function formatWidgetValue(
  value: string,
  icon: string,
  config: WidgetConfig,
  labels: LabelOptions
): string {
  const format = config.format ?? "compact";

  if (format === "minimal") {
    return value;
  }

  const label = format === "detailed" ? labels.long : labels.short;

  // If label is empty, omit the colon
  if (label === "") {
    return `${icon}${value}`;
  }

  return `${icon}${label}:${value}`;
}

/**
 * Format widget value without labels (icon + value only)
 *
 * Simplified version for widgets that don't need labels.
 * Formats output based on the configured format:
 * - minimal: value only (e.g., "50%")
 * - compact: icon + value (e.g., "\uf01750%")
 * - detailed: icon + value (same as compact)
 *
 * @param value - The formatted value string (e.g., "50%", "2h15m")
 * @param icon - Widget icon (e.g., "\uf017")
 * @param config - Widget configuration with format option
 * @returns Formatted string
 */
export function formatWidgetValueSimple(
  value: string,
  icon: string,
  config: WidgetConfig
): string {
  const format = config.format ?? "compact";

  if (format === "minimal") {
    return value;
  }

  return `${icon}${value}`;
}
