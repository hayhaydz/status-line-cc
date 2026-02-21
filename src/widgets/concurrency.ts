/**
 * Concurrency Widget
 *
 * Displays the current model's concurrency limit.
 * Shows how many concurrent requests are allowed.
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { extractModelId } from "../util/model.js";
import { formatWidgetValue } from "../util/format.js";

/** Default concurrency icons */
const DEFAULT_ICON = "\u{f015}";      // Nerd Font: nf-cod-three_bars
const TEXT_CONTENT_ICON = "conc:";     // Text mode
const EMOJI_ICON = "⚙️";                // Emoji: gear

/** Default concurrency limit */
const DEFAULT_CONCURRENCY = 5;

/**
 * Get concurrency limit for model
 */
function getConcurrencyLimit(modelId: string, config?: Config): number {
  return config?.concurrencyLimits?.[modelId] ?? DEFAULT_CONCURRENCY;
}

/**
 * Format concurrency display
 */
function formatConcurrency(
  concurrency: number,
  config: WidgetConfig,
  icon: string
): string {
  return formatWidgetValue(String(concurrency), icon, config, {
    short: "conc",
    long: "concurrency",
  });
}

/**
 * Concurrency Widget
 */
export class ConcurrencyWidget extends BaseWidget {
  readonly name = "concurrency";
  protected defaultIcon = DEFAULT_ICON;
  protected textContentIcon = TEXT_CONTENT_ICON;
  protected emojiIcon = EMOJI_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const modelId = extractModelId(input);

    if (!modelId) {
      return "";
    }

    const concurrency = getConcurrencyLimit(modelId, globalConfig);

    const icon = this.getIcon(config, globalConfig);
    return formatConcurrency(concurrency, config, icon);
  }
}
