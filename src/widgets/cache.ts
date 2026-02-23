/**
 * Cached Tokens Widget
 *
 * Displays cached token usage from context_window.current_usage.
 * Shows cache as percentage of the context window limit.
 * Remembers last known value when data isn't available.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { isTextLabel } from "../util/format.js";

/** Default cache icons */
const DEFAULT_ICON = "\uf47a";  // Nerd Font: nf-mdi-cache
const TEXT_CONTENT_ICON = "c:"; // Text mode (short label)
const EMOJI_ICON = "💾";        // Emoji: floppy disk

/** Default context limit if not provided in input */
const DEFAULT_CONTEXT_LIMIT = 200_000;

/** File to store last known cache percentage - use /tmp for consistency */
const CACHE_STATE_FILE = "/tmp/claude-sl-cache-state.txt";

/**
 * Extract cached tokens from input
 */
function extractCachedTokens(input: ClaudeCodeInput): number {
  const current = input.context_window?.current_usage;
  if (!current) return -1; // -1 means no data available

  const creation = current.cache_creation_input_tokens ?? 0;
  const read = current.cache_read_input_tokens ?? 0;
  return creation + read;
}

/**
 * Get context window size from input, with fallback
 */
function getContextLimit(input: ClaudeCodeInput): number {
  return input.context_window?.context_window_size ?? DEFAULT_CONTEXT_LIMIT;
}

/**
 * Calculate cache as percentage of context limit
 */
function calculatePercentage(tokens: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, Math.round((tokens / limit) * 100));
}

/**
 * Save last known cache percentage to file
 */
function saveCacheState(percentage: number): void {
  try {
    writeFileSync(CACHE_STATE_FILE, String(percentage), "utf-8");
  } catch {
    // Ignore write errors
  }
}

/**
 * Load last known cache percentage from file
 */
function loadCacheState(): number | null {
  try {
    if (existsSync(CACHE_STATE_FILE)) {
      const content = readFileSync(CACHE_STATE_FILE, "utf-8").trim();
      const value = parseInt(content, 10);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        return value;
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * Cache Widget
 */
export class CacheWidget extends BaseWidget {
  readonly name = "cache";
  protected defaultIcon = DEFAULT_ICON;
  protected textContentIcon = TEXT_CONTENT_ICON;
  protected emojiIcon = EMOJI_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const cached = extractCachedTokens(input);
    let percentage: number;

    if (cached >= 0) {
      // We have fresh data
      const contextLimit = getContextLimit(input);
      percentage = calculatePercentage(cached, contextLimit);
      // Save for future use
      saveCacheState(percentage);
    } else {
      // No data available, use last known value
      const lastKnown = loadCacheState();
      if (lastKnown === null) {
        // No data and no history, show 0%
        percentage = 0;
      } else {
        percentage = lastKnown;
      }
    }

    const icon = this.getIcon(config, globalConfig);
    const format = config.format ?? "compact";
    const colorFn = (text: string) => this.formatWithColor(text, globalConfig);

    const formatted = `${percentage}%`;

    // Minimal format: percentage only
    if (format === "minimal") {
      return colorFn ? colorFn(formatted) : formatted;
    }

    // Compact and detailed formats: icon + percentage with conditional spacing
    const separator = isTextLabel(icon) ? "" : " ";
    const result = `${icon}${separator}${formatted}`;
    return colorFn ? colorFn(result) : result;
  }
}
