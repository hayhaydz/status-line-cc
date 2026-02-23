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
import { isTextLabel } from "../util/format.js";

/** Default model icons */
const DEFAULT_ICON = "\u{e26d}";      // Nerd Font: nf-seti-config
const TEXT_CONTENT_ICON = "m:";        // Text mode (shortened)
const EMOJI_ICON = "🤖";                // Emoji: robot face

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
  icon: string,
  colorFn?: (text: string) => string
): string {
  const format = config.format ?? "compact";
  const displayName = getDisplayName(modelId);

  if (format === "minimal") {
    const result = displayName;
    return colorFn ? colorFn(result) : result;
  }

  // Conditional: text labels get no parens, icons get parens
  const isText = isTextLabel(icon);
  const multiplierSymbol = isText
    ? `${multiplier}x`           // "3x" for text
    : `(${multiplier}x)`;        // "(3x)" for icons

  // Conditional spacing: no space for text labels, space for icons
  const separator = isText ? "" : " ";
  const result = `${icon}${separator}${displayName} ${multiplierSymbol}`;
  return colorFn ? colorFn(result) : result;
}

/**
 * Model Widget
 */
export class ModelWidget extends BaseWidget {
  readonly name = "model";
  protected defaultIcon = DEFAULT_ICON;
  protected textContentIcon = TEXT_CONTENT_ICON;
  protected emojiIcon = EMOJI_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const modelId = extractModelId(input);

    if (!modelId) {
      return "";
    }

    // Get multiplier from global config concurrency limits
    const multiplier = globalConfig?.concurrencyLimits?.[modelId] ?? 1;

    const icon = this.getIcon(config, globalConfig);
    const colorFn = (text: string) => this.formatWithColor(text, globalConfig);

    return formatModel(modelId, multiplier, config, icon, colorFn);
  }
}
