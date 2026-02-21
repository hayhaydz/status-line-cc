/**
 * GLM Quota Widget
 *
 * Fetches and displays GLM Coding Plan quota information.
 * Shows 5-hour block percentage.
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config, GLMQuotaResponse } from "../types.js";
import { BaseWidget } from "../widget.ts";
import { getGLMQuota as fetchGLMQuotaRaw } from "../util/glm-api.ts";
import { debug } from "../util/logger.ts";
import { formatWidgetValueSimple } from "../util/format.ts";

/** Default quota icons */
const DEFAULT_ICON = "\u{f0a9e}";      // Nerd Font: nf-mdi-chart_bar
const TEXT_CONTENT_ICON = "quota:";    // Text mode
const EMOJI_ICON = "📊";                // Emoji: bar chart

/**
 * Map raw API response to simplified GLMQuotaResponse
 */
function mapQuotaResponse(raw: Awaited<ReturnType<typeof fetchGLMQuotaRaw>>): GLMQuotaResponse {
  if ("error" in raw) {
    return { error: raw.error };
  }

  // Find TOKENS_LIMIT (5-hour block) and TIME_LIMIT (MCP usage)
  const tokenLimit = raw.limits.find((limit) => limit.type === "TOKENS_LIMIT");
  const timeLimit = raw.limits.find((limit) => limit.type === "TIME_LIMIT");

  return {
    timestamp: Date.now(),
    blockUsage: tokenLimit?.percentage ?? 0,
    mcpUsage: timeLimit?.percentage ?? 0,
  };
}

/**
 * Format quota display
 */
function formatQuota(
  quota: GLMQuotaResponse,
  config: WidgetConfig,
  icon: string,
  colorFn?: (text: string) => string
): string {
  const format = config.format ?? "compact";

  if (quota.error) {
    // Show error in detailed mode, hide in compact/minimal
    if (format === "detailed") {
      return `${icon}err`;
    }
    return "";
  }

  const blockPercent = quota.blockUsage ?? 0;

  // Use simple format (icon + value, no label)
  return formatWidgetValueSimple(`${blockPercent}%`, icon, config, colorFn);
}

/**
 * GLM Quota Widget
 */
export class GLMWidget extends BaseWidget {
  readonly name = "glm";
  protected defaultIcon = DEFAULT_ICON;
  protected textContentIcon = TEXT_CONTENT_ICON;
  protected emojiIcon = EMOJI_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const raw = await fetchGLMQuotaRaw(globalConfig);
    const quota = mapQuotaResponse(raw);

    const icon = this.getIcon(config, globalConfig);
    const colorFn = (text: string) => this.formatWithColor(text, globalConfig);

    return formatQuota(quota, config, icon, colorFn);
  }
}
