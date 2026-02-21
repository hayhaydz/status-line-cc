/**
 * Cached Tokens Widget
 *
 * Displays cached token usage from context_window.current_usage.
 * Shows sum of cache_creation_input_tokens and cache_read_input_tokens.
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";

/** Default cache icon (Nerd Font lightning) */
const DEFAULT_ICON = "\uf0e7"; // nf-fa-bolt

/**
 * Extract cached tokens from input
 */
function extractCachedTokens(input: ClaudeCodeInput): number {
  const current = input.context_window?.current_usage;
  if (!current) return 0;

  const creation = current.cache_creation_input_tokens ?? 0;
  const read = current.cache_read_input_tokens ?? 0;
  return creation + read;
}

/**
 * Format cached token count
 */
function formatCachedTokens(tokens: number): string {
  if (tokens === 0) return "";
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

/**
 * Cache Widget
 */
export class CacheWidget extends BaseWidget {
  readonly name = "cache";
  protected defaultIcon = DEFAULT_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const cached = extractCachedTokens(input);

    if (cached === 0) {
      return "";
    }

    const icon = this.getIcon(config);
    const format = config.format ?? "compact";

    if (format === "minimal") {
      return formatCachedTokens(cached);
    }

    const formatted = formatCachedTokens(cached);

    // Detailed format includes icon, compact does not
    if (format === "detailed") {
      return `${icon}${formatted}`;
    }

    return formatted;
  }
}

/**
 * Create a cache widget instance
 */
export function createCacheWidget(): Widget {
  return new CacheWidget();
}
