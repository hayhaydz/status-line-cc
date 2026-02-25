/**
 * Model Widget
 *
 * Displays the current model name with concurrency multiplier.
 * Includes subagent info when tasks are running.
 */

import type { WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { extractModelId } from "../util/model.js";
import { getActiveTasksByModel } from "../util/task-tracker.js";

/** Default concurrency limit */
const DEFAULT_CONCURRENCY = 5;

/** Model display name mappings */
const MODEL_NAMES: Record<string, string> = {
  "claude-opus-4-6": "Opus 4.6",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
  "glm-4.5": "GLM-4.5",
  "glm-4.6": "GLM-4.6",
  "glm-4.7": "GLM-4.7",
  "glm-5": "GLM-5",
  "glm-4.5-air": "GLM-4.5-air",
};

/**
 * Get display name for model
 */
function getDisplayName(modelId: string): string {
  return MODEL_NAMES[modelId] ?? modelId.split("/").pop() ?? modelId;
}

/**
 * Get concurrency limit for model
 */
function getConcurrencyLimit(modelId: string, config?: Config): number {
  return config?.concurrencyLimits?.[modelId] ?? DEFAULT_CONCURRENCY;
}

/**
 * Model Widget - includes subagent concurrency info
 */
export class ModelWidget extends BaseWidget {
  readonly name = "model";

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string | null> {
    const modelId = extractModelId(input);

    if (!modelId) {
      return null;
    }

    const displayName = getDisplayName(modelId);
    const multiplier = getConcurrencyLimit(modelId, globalConfig);

    const parts = [`${displayName} ${multiplier}x`];

    // Add subagent info if any are running
    if (input.session_id) {
      const tasksByModel = getActiveTasksByModel(input.session_id);

      // Remove main model from the map to only show subagent models
      tasksByModel.delete(modelId);

      if (tasksByModel.size > 0) {
        const subagentParts: string[] = [];
        for (const [subModelId, active] of Array.from(tasksByModel.entries())) {
          const subLimit = getConcurrencyLimit(subModelId, globalConfig);
          const subShort = subModelId.replace(/^glm-/, ""); // glm-4.7 -> 4.7
          subagentParts.push(`+${subShort}_${subLimit}x:${active}/${subLimit}`);
        }
        subagentParts.sort();
        parts.push(`[${subagentParts.join(" ")}]`);
      }
    }

    return parts.join(" ");
  }
}
