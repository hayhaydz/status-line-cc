/**
 * Tools Widget
 *
 * Displays web search/reader quota from GLM API.
 * Shows as t:xx% format.
 */

import type { WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { getQuotaLimit } from "../util/glm-api.js";

/** TIME_LIMIT is the MCP/tools usage in GLM API */
const MCP_LIMIT_TYPE = "TIME_LIMIT";

/**
 * Tools Widget - shows MCP/web quota usage
 */
export class ToolsWidget extends BaseWidget {
  readonly name = "tools";

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string | null> {
    const mcpLimit = await getQuotaLimit(globalConfig, MCP_LIMIT_TYPE);
    if (!mcpLimit) return null;

    const percentage = mcpLimit.percentage ?? 0;
    if (percentage === 0) return null;

    return `t:${percentage}%`;
  }
}
