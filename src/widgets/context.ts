/**
 * Context Widget
 *
 * Reads actual token usage from transcript.jsonl to show context window utilization.
 * Displays exact token count (e.g., t:153k) instead of percentage.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { debug } from "../util/logger.js";
import { formatWidgetValue } from "../util/format.js";

/** Default context icons */
const DEFAULT_ICON = "\uf49b";      // Nerd Font: nf-mdi-flash
const TEXT_CONTENT_ICON = "t:";     // Text mode (t for tokens)
const EMOJI_ICON = "⚡";            // Emoji: high voltage

/** Default context limit if not provided in input */
const DEFAULT_CONTEXT_LIMIT = 200_000;

/**
 * Get context limit from input, with fallback
 * Prefers context_window_size from input as it's the authoritative source.
 */
function getContextLimit(input: ClaudeCodeInput): number {
  // Use context_window_size from input if available (most reliable)
  if (input.context_window?.context_window_size) {
    return input.context_window.context_window_size;
  }
  return DEFAULT_CONTEXT_LIMIT;
}

/**
 * Format token count for display
 *
 * Converts large numbers to compact format:
 * - 153000 -> "153k"
 * - 1200 -> "1.2k"
 * - 500 -> "500"
 */
function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    const val = tokens / 1_000_000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}m`;
  }
  if (tokens >= 1_000) {
    const val = tokens / 1_000;
    return `${val % 1 === 0 ? Math.round(val) : val.toFixed(1)}k`;
  }
  return String(tokens);
}

/**
 * Usage data from an assistant message
 */
interface UsageData {
  input_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens: number;
}

/**
 * Transcript message types
 */
interface TranscriptMessage {
  type: string;
  message?: {
    usage?: UsageData;
  };
}

/**
 * Extract token usage from the last assistant message in transcript
 *
 * Returns input_tokens + cache_read_input_tokens for total context usage.
 */
async function getLastAssistantTokenCount(transcriptPath: string): Promise<number> {
  try {
    if (!existsSync(transcriptPath)) {
      debug(`Transcript not found: ${transcriptPath}`);
      return 0;
    }

    const content = await readFile(transcriptPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    // Find the last assistant message with usage data
    // Read from end to start for efficiency
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const msg: TranscriptMessage = JSON.parse(lines[i]);

        if (msg.type === "assistant" && msg.message?.usage) {
          const usage = msg.message.usage;
          // Total input context = new tokens + cached tokens
          const totalInput =
            (usage.input_tokens ?? 0) +
            (usage.cache_read_input_tokens ?? 0) +
            (usage.cache_creation_input_tokens ?? 0);

          if (totalInput > 0) {
            debug(`Found usage: input=${usage.input_tokens}, cache_read=${usage.cache_read_input_tokens}, total=${totalInput}`);
            return totalInput;
          }
        }
      } catch {
        // Skip malformed lines
        continue;
      }
    }

    debug("No assistant message with usage data found");
    return 0;
  } catch (error) {
    debug(`Failed to parse transcript: ${(error as Error).message}`);
    return 0;
  }
}

/**
 * Format context display
 */
function formatContext(
  tokens: number,
  limit: number,
  config: WidgetConfig,
  icon: string,
  colorFn?: (text: string) => string
): string {
  const formattedTokens = formatTokenCount(tokens);
  const formattedLimit = formatTokenCount(limit);

  // Show as "tokens/limit" format
  const value = formatWidgetValue(`${formattedTokens}/${formattedLimit}`, icon, config, {
    short: "",
    long: "t",
  }, colorFn);

  return value;
}

/**
 * Context Widget
 */
export class ContextWidget extends BaseWidget {
  readonly name = "context";
  protected defaultIcon = DEFAULT_ICON;
  protected textContentIcon = TEXT_CONTENT_ICON;
  protected emojiIcon = EMOJI_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const transcriptPath = input.transcript_path;

    if (!transcriptPath) {
      return "";
    }

    const limit = getContextLimit(input);

    const tokens = await getLastAssistantTokenCount(transcriptPath);

    if (tokens === 0) {
      return "";
    }

    const icon = this.getIcon(config, globalConfig);
    const colorFn = (text: string) => this.formatWithColor(text, globalConfig);

    return formatContext(tokens, limit, config, icon, colorFn);
  }
}
