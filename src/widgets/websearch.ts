/**
 * Web Search Limit Widget
 *
 * Displays monthly web search/reader quota from GLM API.
 * Shows percentage and count of MCP usage (search-prime, web-reader tools).
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { getGLMQuota, findQuotaLimit, type GLMQuotaLimit } from "../util/glm-api.js";

/** Default web search icons */
const DEFAULT_ICON = "\u{f0ac}";      // Nerd Font: nf-fa-globe
const TEXT_CONTENT_ICON = "web:";      // Text mode
const EMOJI_ICON = "🌐";                // Emoji: globe

/** MCP usage limit type in GLM API */
const MCP_LIMIT_TYPE = "MCP usage(1 Month)";

/**
 * Extract web search quota from GLM API response
 */
function extractWebSearchQuota(quota: GLMQuotaLimit): {
  percentage: number;
  currentUsage: number;
  total: number;
} {
  return {
    percentage: quota.percentage ?? 0,
    currentUsage: quota.currentUsage ?? 0,
    total: quota.totol ?? 0, // Note: API has typo "totol" not "total"
  };
}

/**
 * Format web search quota display
 */
function formatWebSearchQuota(
  quota: { percentage: number; currentUsage: number; total: number },
  config: WidgetConfig,
  icon: string
): string {
  const format = config.format ?? "compact";
  const { percentage, currentUsage, total } = quota;

  if (format === "minimal") {
    return `${percentage}%`;
  }

  if (format === "detailed") {
    return `${icon}${percentage}% (${currentUsage}/${total})`;
  }

  // Compact format (default)
  return `${icon}${percentage}%`;
}

/**
 * Web Search Limit Widget
 */
export class WebSearchWidget extends BaseWidget {
  readonly name = "websearch";
  protected defaultIcon = DEFAULT_ICON;
  protected textContentIcon = TEXT_CONTENT_ICON;  // ADD THIS
  protected emojiIcon = EMOJI_ICON;               // ADD THIS

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const quota = await getGLMQuota(globalConfig);

    // Check for error or missing data
    if ("error" in quota) {
      return "";
    }

    // Find MCP usage limit
    const mcpLimit = findQuotaLimit(quota, MCP_LIMIT_TYPE);
    if (!mcpLimit) {
      return "";
    }

    const webSearchQuota = extractWebSearchQuota(mcpLimit);
    const icon = this.getIcon(config, globalConfig);

    return formatWebSearchQuota(webSearchQuota, config, icon);
  }
}
