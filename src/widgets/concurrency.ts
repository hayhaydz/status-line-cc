/**
 * Concurrency Widget
 *
 * Displays the current model's concurrency limit.
 * Shows how many concurrent requests are allowed.
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";

/** Default concurrency icon (Nerd Font sync) */
const DEFAULT_ICON = "\uf046"; // nf-cod-sync

/** Default concurrency limit */
const DEFAULT_CONCURRENCY = 5;

/**
 * Extract model ID from input
 */
function extractModelId(input: ClaudeCodeInput): string | undefined {
  if (!input.model) {
    return undefined;
  }

  if (typeof input.model === "string") {
    return input.model;
  }

  return input.model.id;
}

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
  const format = config.format ?? "compact";

  if (format === "minimal") {
    return String(concurrency);
  }

  const label = format === "detailed" ? "concurrency" : "conc";

  return `${icon}${label}:${concurrency}`;
}

/**
 * Concurrency Widget
 */
export class ConcurrencyWidget extends BaseWidget {
  readonly name = "concurrency";
  protected defaultIcon = DEFAULT_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const modelId = extractModelId(input);

    if (!modelId) {
      return "";
    }

    const concurrency = getConcurrencyLimit(modelId, globalConfig);

    const icon = this.getIcon(config);
    return formatConcurrency(concurrency, config, icon);
  }
}

/**
 * Create a concurrency widget instance
 */
export function createConcurrencyWidget(): Widget {
  return new ConcurrencyWidget();
}
