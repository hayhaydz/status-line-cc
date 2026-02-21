/**
 * Model Widget
 *
 * Displays the current model name with concurrency multiplier.
 * Extracts model info from Claude Code input JSON.
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { getWidgetConfig } from "../config.js";
import { extractModelId } from "../util/model.js";

/** Default model icon (Nerd Font robot) */
const DEFAULT_ICON = "\uf1b4"; // nf-fa-robot

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
 * Format model display with multiplier
 */
function formatModel(
  modelId: string,
  multiplier: number,
  config: WidgetConfig,
  icon: string
): string {
  const format = config.format ?? "compact";
  const displayName = getDisplayName(modelId);

  if (format === "minimal") {
    return displayName;
  }

  const multiplierSymbol = format === "detailed" ? `(${multiplier}×)` : `(${multiplier}x)`;

  return `${icon}${displayName} ${multiplierSymbol}`;
}

/**
 * Model Widget
 */
export class ModelWidget extends BaseWidget {
  readonly name = "model";
  protected defaultIcon = DEFAULT_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const modelId = extractModelId(input);

    if (!modelId) {
      return "";
    }

    // Get multiplier from global config concurrency limits
    const multiplier = globalConfig?.concurrencyLimits?.[modelId] ?? 1;

    const icon = this.getIcon(config);
    return formatModel(modelId, multiplier, config, icon);
  }
}
