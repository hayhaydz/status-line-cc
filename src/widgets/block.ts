/**
 * Block Widget
 *
 * Displays 5-hour block time remaining using fixed UTC schedule.
 * Block reset times: 00:00, 05:00, 10:00, 15:00, 20:00 UTC.
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { formatWidgetValue } from "../util/format.js";
import { getTimeRemaining } from "../util/time.js";

/** Default block icon (Nerd Font clock) */
const DEFAULT_ICON = "\uf017"; // nf-fa-clock

/**
 * Format time remaining
 */
function formatTimeRemaining(ms: number, format: "compact" | "detailed" | "minimal"): string {
  if (format === "minimal") {
    // Just show hours
    const hours = Math.floor(ms / (60 * 60 * 1000));
    return `${hours}h`;
  }

  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (format === "compact") {
    return `${hours}h${minutes}m`;
  }

  // detailed
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format block display
 */
function formatBlock(
  timeRemaining: number,
  config: WidgetConfig,
  icon: string
): string {
  const format = config.format ?? "compact";
  const timeStr = formatTimeRemaining(timeRemaining, format);

  return formatWidgetValue(timeStr, icon, config, {
    short: "",
    long: "block",
  });
}

/**
 * Block Widget
 */
export class BlockWidget extends BaseWidget {
  readonly name = "block";
  protected defaultIcon = DEFAULT_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const timeRemaining = getTimeRemaining(new Date());

    const icon = this.getIcon(config);
    return formatBlock(timeRemaining, config, icon);
  }
}

/**
 * Create a block widget instance
 */
export function createBlockWidget(): Widget {
  return new BlockWidget();
}
