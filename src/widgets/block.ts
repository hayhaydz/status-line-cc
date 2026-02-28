/**
 * Block Widget
 *
 * Displays 5-hour block time remaining using GLM API's nextResetTime.
 * Falls back to calculated drifting schedule when API unavailable.
 */

import type { WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { getTimeRemaining } from "../util/time.js";
import { getQuotaLimit } from "../util/glm-api.js";

/** TOKENS limit type in GLM API (5-hour block) */
const TOKENS_LIMIT_TYPE = "TOKENS_LIMIT";

/**
 * Format time remaining as XhYm
 */
function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h${minutes}m`;
}

/**
 * Block Widget - shows time remaining and block usage
 */
export class BlockWidget extends BaseWidget {
  readonly name = "block";

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string | null> {
    // Get token limit from API
    const tokenLimit = await getQuotaLimit(globalConfig, TOKENS_LIMIT_TYPE);

    // Calculate time remaining
    const timeRemaining = tokenLimit?.nextResetTime
      ? tokenLimit.nextResetTime - Date.now()
      : getTimeRemaining(new Date());

    const timeStr = formatTimeRemaining(timeRemaining);

    // Show percentage if available
    if (tokenLimit?.percentage !== undefined) {
      return `${timeStr} [${tokenLimit.percentage}%]`;
    }

    return timeStr;
  }
}
