/**
 * Concurrency Widget
 *
 * Displays the current model's concurrency limit with active task count.
 * Shows "model:active/limit" format with subagent models in brackets.
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { extractModelId } from "../util/model.js";
import { getActiveTasksByModel } from "../util/task-tracker.js";

/** Default concurrency limit */
const DEFAULT_CONCURRENCY = 5;

/**
 * Get concurrency limit for model
 */
function getConcurrencyLimit(modelId: string, config?: Config): number {
  return config?.concurrencyLimits?.[modelId] ?? DEFAULT_CONCURRENCY;
}

/**
 * Concurrency Widget
 */
export class ConcurrencyWidget extends BaseWidget {
  readonly name = "concurrency";
  // Icon support removed - all icons are empty strings
  protected defaultIcon = "";
  protected textContentIcon = "";
  protected emojiIcon = "";

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const modelId = extractModelId(input);

    if (!modelId) {
      return "";
    }

    const limit = getConcurrencyLimit(modelId, globalConfig);

    // If no session_id, show simple format: model:limit
    if (!input.session_id) {
      return `${modelId}:${limit}`;
    }

    // Get active tasks by model
    const tasksByModel = getActiveTasksByModel(input.session_id);
    const mainModelActive = tasksByModel.get(modelId) ?? 0;

    // Remove main model from the map to only show subagent models in brackets
    tasksByModel.delete(modelId);

    // Build the main part: model:active/limit
    const mainPart = `${modelId}:${mainModelActive}/${limit}`;

    // If no subagent models, return just the main part
    if (tasksByModel.size === 0) {
      return mainPart;
    }

    // Build subagent parts: +model:active/limit
    const subagentParts: string[] = [];
    for (const entry of Array.from(tasksByModel.entries())) {
      const [subModelId, active] = entry;
      const subLimit = getConcurrencyLimit(subModelId, globalConfig);
      subagentParts.push(`+${subModelId}:${active}/${subLimit}`);
    }

    // Sort subagent parts for consistent output
    subagentParts.sort();

    return `${mainPart} [${subagentParts.join(" ")}]`;
  }
}
