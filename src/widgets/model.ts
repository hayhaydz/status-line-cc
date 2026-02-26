/**
 * Model Widget
 *
 * Displays the current model name with quota usage multiplier.
 * Includes subagent info when tasks are running, grouped by model.
 */

import type { WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { extractModelId } from "../util/model.js";
import { extractModel, type PreToolUseInput } from "../util/models.js";
import { getActiveTasksByModel } from "../util/task-tracker.js";
import { getSessionKey } from "../util/session.js";

/** Peak/off-peak multipliers for GLM-5 */
const GLM5_PEAK_MULTIPLIER = 3;
const GLM5_OFFPEAK_MULTIPLIER = 2;
const DEFAULT_CONCURRENCY_LIMIT = 5;

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
 * Check if model should use GLM-5 peak/off-peak multiplier.
 */
function isGlm5Model(modelId: string): boolean {
  const normalized = modelId.toLowerCase();
  return normalized === "glm-5" || normalized.endsWith("/glm-5") || normalized === "claude-opus-4-6";
}

/**
 * Peak window is 14:00-18:00 at UTC+8.
 */
function isPeakHoursUtcPlus8(now: Date): boolean {
  const hourUtcPlus8 = (now.getUTCHours() + 8) % 24;
  return hourUtcPlus8 >= 14 && hourUtcPlus8 < 18;
}

/**
 * Get quota usage multiplier for model.
 * GLM-5: 3x peak, 2x off-peak. Other models: 1x.
 * Test override: STATUSLINE_GLM5_MULTIPLIER=2|3
 */
function getUsageMultiplier(modelId: string, now = new Date()): number {
  if (!isGlm5Model(modelId)) {
    return 1;
  }

  const forced = process.env.STATUSLINE_GLM5_MULTIPLIER;
  if (forced === "2") return GLM5_OFFPEAK_MULTIPLIER;
  if (forced === "3") return GLM5_PEAK_MULTIPLIER;

  return isPeakHoursUtcPlus8(now) ? GLM5_PEAK_MULTIPLIER : GLM5_OFFPEAK_MULTIPLIER;
}

/**
 * Get configured parallel task limit for model.
 */
function getConcurrencyLimit(modelId: string, config?: Config): number {
  return config?.concurrencyLimits?.[modelId] ?? DEFAULT_CONCURRENCY_LIMIT;
}

/**
 * Model Widget - includes subagent concurrency info grouped by model
 */
export class ModelWidget extends BaseWidget {
  readonly name = "model";

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string | null> {
    const rawModelId = extractModelId(input);

    if (!rawModelId) {
      return null;
    }

    // Map to GLM model name for consistent display and matching
    const glmModelId = extractModel({ tool_input: { model: rawModelId } } as PreToolUseInput);
    const displayName = getDisplayName(glmModelId);
    const multiplier = getUsageMultiplier(glmModelId);

    const parts = [`${displayName} ${multiplier}x`];

    // Add subagent info if any are running
    if (input.session_id) {
      // Use hashed session key to match what hooks create
      const sessionKey = getSessionKey(input as any);

      // Debug: log to stderr
      if (process.env.STATUSLINE_DEBUG === "1") {
        console.error(`[model widget] session_id=${input.session_id} sessionKey=${sessionKey}`);
      }

      const tasksByModel = getActiveTasksByModel(sessionKey);

      // Show ALL active subagents, even if they match the main model
      // The main model display is just what the primary session is using

      if (tasksByModel.size > 0) {
        const subagentParts: string[] = [];
        for (const [subModelId, active] of Array.from(tasksByModel.entries())) {
          const subMultiplier = getUsageMultiplier(subModelId);
          const subLimit = getConcurrencyLimit(subModelId, globalConfig);
          const subShort = getShortName(subModelId);
          subagentParts.push(`+${subShort}_${subMultiplier}x:${active}/${subLimit}`);
        }
        subagentParts.sort();
        parts.push(`[${subagentParts.join(" ")}]`);
      }
    }

    return parts.join(" ");
  }
}
