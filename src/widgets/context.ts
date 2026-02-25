/**
 * Context Widget
 *
 * Displays context window utilization with cache percentage.
 * Reads token usage from transcript.jsonl and cache from context_window.current_usage.
 */

import { readFile } from "node:fs/promises";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { debug } from "../util/logger.js";

/** Default context limit if not provided in input */
const DEFAULT_CONTEXT_LIMIT = 200_000;

/** File to store last known cache percentage */
const CACHE_STATE_FILE = "/tmp/claude-sl-cache-state.txt";

/**
 * Get context limit from input, with fallback
 */
function getContextLimit(input: ClaudeCodeInput): number {
  if (input.context_window?.context_window_size) {
    return input.context_window.context_window_size;
  }
  return DEFAULT_CONTEXT_LIMIT;
}

/**
 * Format token count for display (153000 -> "153k", 1200 -> "1.2k")
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
 * Extract cached tokens from input
 */
function extractCachedTokens(input: ClaudeCodeInput): number {
  const current = input.context_window?.current_usage;
  if (!current) return -1;

  const creation = current.cache_creation_input_tokens ?? 0;
  const read = current.cache_read_input_tokens ?? 0;
  return creation + read;
}

/**
 * Calculate cache as percentage of context limit
 */
function calculatePercentage(tokens: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, Math.round((tokens / limit) * 100));
}

/**
 * Save/load cache state for persistence
 */
function saveCacheState(percentage: number): void {
  try {
    writeFileSync(CACHE_STATE_FILE, String(percentage), "utf-8");
  } catch { /* ignore */ }
}

function loadCacheState(): number | null {
  try {
    if (existsSync(CACHE_STATE_FILE)) {
      const content = readFileSync(CACHE_STATE_FILE, "utf-8").trim();
      const value = parseInt(content, 10);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        return value;
      }
    }
  } catch { /* ignore */ }
  return null;
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
 */
async function getLastAssistantTokenCount(transcriptPath: string): Promise<number> {
  try {
    if (!existsSync(transcriptPath)) {
      debug(`Transcript not found: ${transcriptPath}`);
      return 0;
    }

    const content = await readFile(transcriptPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const msg: TranscriptMessage = JSON.parse(lines[i]);

        if (msg.type === "assistant" && msg.message?.usage) {
          const usage = msg.message.usage;
          const totalInput =
            (usage.input_tokens ?? 0) +
            (usage.cache_read_input_tokens ?? 0) +
            (usage.cache_creation_input_tokens ?? 0);

          if (totalInput > 0) {
            debug(`Found usage: total=${totalInput}`);
            return totalInput;
          }
        }
      } catch {
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
 * Context Widget - shows token usage and cache percentage
 */
export class ContextWidget extends BaseWidget {
  readonly name = "context";

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string | null> {
    const transcriptPath = input.transcript_path;

    if (!transcriptPath) {
      return null;
    }

    const limit = getContextLimit(input);
    const tokens = await getLastAssistantTokenCount(transcriptPath);

    if (tokens === 0) {
      return null;
    }

    const used = formatTokenCount(tokens);
    const total = formatTokenCount(limit);

    let output = `${used}/${total}`;

    // Add cache percentage if available
    const cached = extractCachedTokens(input);
    let cachePercentage: number;

    if (cached >= 0) {
      cachePercentage = calculatePercentage(cached, limit);
      saveCacheState(cachePercentage);
    } else {
      const lastKnown = loadCacheState();
      cachePercentage = lastKnown ?? 0;
    }

    if (cachePercentage > 0) {
      output += ` [${cachePercentage}%]`;
    }

    return output;
  }
}
