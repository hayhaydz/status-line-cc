/**
 * Model Widget
 *
 * Displays the current model name with concurrency multiplier.
 * Includes subagent info when tasks are running, grouped by model.
 */

import type { WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { extractModelId } from "../util/model.js";
import { getActiveTasksByModel } from "../util/task-tracker.js";
import { getSessionKey } from "../util/session.js";

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

/** Short names for subagent display (GLM models) */
const MODEL_SHORT_NAMES: Record<string, string> = {
  "glm-5": "5",
  "glm-4.7": "4.7",
  "glm-4.5-air": "air",
  "glm-4.6": "4.6",
  "glm-4.5": "4.5",
  // Legacy Claude names (for backward compatibility)
  "claude-opus-4-6": "5",
  "claude-sonnet-4-6": "4.7",
  "claude-haiku-4-5-20251001": "air",
};

/**
 * Get display name for model
 */
function getDisplayName(modelId: string): string {
  return MODEL_NAMES[modelId] ?? modelId.split("/").pop() ?? modelId;
}

/**
 * Get short name for model (for subagent display)
 */
function getShortName(modelId: string): string {
  return MODEL_SHORT_NAMES[modelId] ?? modelId.slice(0, 4);
}

/**
 * Get concurrency limit for model
 */
function getConcurrencyLimit(modelId: string, config?: Config): number {
  return config?.concurrencyLimits?.[modelId] ?? DEFAULT_CONCURRENCY;
}

/**
 * Model Widget - includes subagent concurrency info grouped by model
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
      // Use hashed session key to match what hooks create
      const sessionKey = getSessionKey(input);
      const tasksByModel = getActiveTasksByModel(sessionKey);

      // Remove main model from the map to only show subagent models
      tasksByModel.delete(modelId);

      if (tasksByModel.size > 0) {
        const subagentParts: string[] = [];
        for (const [subModelId, active] of Array.from(tasksByModel.entries())) {
          const subLimit = getConcurrencyLimit(subModelId, globalConfig);
          const subShort = getShortName(subModelId);
          subagentParts.push(`+${subShort}_${subLimit}x:${active}/${subLimit}`);
        }
        subagentParts.sort();
        parts.push(`[${subagentParts.join(" ")}]`);
      }
    }

    return parts.join(" ");
  }
}
