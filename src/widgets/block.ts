/**
 * Block Widget
 *
 * Displays 5-hour block time remaining using GLM API's nextResetTime.
 * Falls back to calculated drifting schedule when API unavailable.
 */

import type { WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { getTimeRemaining } from "../util/time.js";
import { getGLMQuota, findQuotaLimit } from "../util/glm-api.js";

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
    let timeRemaining: number;
    let percentage: number | undefined;

    // Try to get time from GLM API
    try {
      const quota = await getGLMQuota(globalConfig);

      if (!("error" in quota)) {
        const tokenLimit = findQuotaLimit(quota, TOKENS_LIMIT_TYPE);
        if (tokenLimit) {
          // Use API's exact nextResetTime if available
          if (tokenLimit.nextResetTime) {
            timeRemaining = tokenLimit.nextResetTime - Date.now();
          } else {
            // Fall back to calculated schedule
            timeRemaining = getTimeRemaining(new Date());
          }
          percentage = tokenLimit.percentage;
        } else {
          timeRemaining = getTimeRemaining(new Date());
        }
      } else {
        // API error - use calculated schedule
        timeRemaining = getTimeRemaining(new Date());
      }
    } catch {
      // Fall back to calculated schedule
      timeRemaining = getTimeRemaining(new Date());
    }

    const timeStr = formatTimeRemaining(timeRemaining);

    if (percentage !== undefined) {
      return `${timeStr} [${percentage}%]`;
    }

    return timeStr;
  }
}
