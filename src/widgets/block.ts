/**
 * Block Widget
 *
 * Displays 5-hour block time remaining using drifting 5-day rotation.
 * Schedule drifts backward by 1 hour each day (24 not divisible by 5).
 * Also shows block usage percentage from GLM API.
 * Anchor: 2026-02-21 @ 21:23 UTC
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
    const timeRemaining = getTimeRemaining(new Date());
    const timeStr = formatTimeRemaining(timeRemaining);

    // Get block usage from GLM API
    try {
      const quota = await getGLMQuota(globalConfig);

      if (!("error" in quota)) {
        const tokenLimit = findQuotaLimit(quota, TOKENS_LIMIT_TYPE);
        if (tokenLimit && tokenLimit.percentage !== undefined) {
          return `${timeStr} [${tokenLimit.percentage}%]`;
        }
      }
    } catch {
      // Fall through to time-only display
    }

    return timeStr;
  }
}
