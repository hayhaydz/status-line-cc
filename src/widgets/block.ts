/**
 * Block Widget
 *
 * Displays 5-hour block time remaining using fixed UTC schedule.
 * Block reset times: 00:00, 05:00, 10:00, 15:00, 20:00 UTC.
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { formatWidgetValue } from "../util/format.js";

/** Default block icon (Nerd Font clock) */
const DEFAULT_ICON = "\uf017"; // nf-fa-clock

/** Block reset times in UTC hours */
const BLOCK_RESET_HOURS = [0, 5, 10, 15, 20];

/** Block duration in milliseconds (5 hours) */
const BLOCK_DURATION = 5 * 60 * 60 * 1000;

/**
 * Get current block start time in UTC
 */
function getCurrentBlockStart(): Date {
  const now = new Date();
  const utcHour = now.getUTCHours();

  // Find the most recent block reset hour
  let blockHour = BLOCK_RESET_HOURS[0];
  for (const hour of BLOCK_RESET_HOURS) {
    if (utcHour >= hour) {
      blockHour = hour;
    } else {
      break;
    }
  }

  // Create date for block start
  const blockStart = new Date(now);
  blockStart.setUTCHours(blockHour, 0, 0, 0);

  // If we're in the next day's first block, adjust
  if (now < blockStart) {
    blockStart.setUTCDate(blockStart.getUTCDate() - 1);
  }

  return blockStart;
}

/**
 * Get current block end time in UTC
 */
function getCurrentBlockEnd(): Date {
  const blockStart = getCurrentBlockStart();
  return new Date(blockStart.getTime() + BLOCK_DURATION);
}

/**
 * Calculate time remaining in current block (milliseconds)
 */
function getTimeRemaining(): number {
  const blockEnd = getCurrentBlockEnd();
  const now = new Date();
  return Math.max(0, blockEnd.getTime() - now.getTime());
}

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
    const timeRemaining = getTimeRemaining();

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
