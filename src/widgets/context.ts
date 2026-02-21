/**
 * Context Widget
 *
 * Parses transcript.jsonl to calculate token and MCP usage percentages.
 * Shows context window utilization.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Widget, WidgetConfig, ClaudeCodeInput, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { debug } from "../util/logger.js";
import { extractModelId } from "../util/model.js";
import { formatWidgetValue } from "../util/format.js";

/** Default context icon (Nerd Font bolt) */
const DEFAULT_ICON = "\uf0e7"; // nf-fa-bolt

/** Context window limits (tokens) */
const CONTEXT_LIMITS: Record<string, number> = {
  "claude-opus-4-6": 200_000,
  "claude-sonnet-4-6": 200_000,
  "claude-haiku-4-5-20251001": 200_000,
};

/** Default context limit */
const DEFAULT_CONTEXT_LIMIT = 200_000;

/**
 * Get context limit for model
 */
function getContextLimit(modelId?: string): number {
  if (!modelId) {
    return DEFAULT_CONTEXT_LIMIT;
  }
  return CONTEXT_LIMITS[modelId] ?? DEFAULT_CONTEXT_LIMIT;
}

/**
 * Parse transcript.jsonl to count tokens
 *
 * Returns estimated token count based on message lines.
 * This is a rough estimate - actual token count may vary.
 */
async function parseTranscriptTokenCount(transcriptPath: string): Promise<number> {
  try {
    if (!existsSync(transcriptPath)) {
      debug(`Transcript not found: ${transcriptPath}`);
      return 0;
    }

    const content = await readFile(transcriptPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    // Each line in transcript is a JSON message
    // Rough estimate: ~4 characters per token (very approximate)
    // This is intentionally simple - accurate token counting requires the tokenizer
    const totalChars = lines.reduce((sum, line) => {
      try {
        const msg = JSON.parse(line);
        // Count content length from various message types
        const contentLength =
          (msg.content?.length ?? 0) +
          (msg.partial_json?.length ?? 0) +
          (msg.tool_use?.input?.length ? JSON.stringify(msg.tool_use.input).length : 0) +
          (msg.tool_result?.content?.length ?? 0) +
          (msg.thinking?.length ?? 0);

        return sum + contentLength;
      } catch {
        return sum;
      }
    }, 0);

    // Rough estimate: 4 chars per token
    return Math.ceil(totalChars / 4);
  } catch (error) {
    debug(`Failed to parse transcript: ${(error as Error).message}`);
    return 0;
  }
}

/**
 * Calculate token usage percentage
 */
function calculatePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Create a progress bar string
 *
 * @param percentage - Percentage (0-100)
 * @returns Progress bar string like "[██████░░░░]"
 */
function createProgressBar(percentage: number): string {
  const width = 10;
  const filledCount = Math.round((percentage / 100) * width);
  const emptyCount = width - filledCount;

  const filled = "█".repeat(filledCount);
  const empty = "░".repeat(emptyCount);

  return `[${filled}${empty}]`;
}

/**
 * Format context display
 */
function formatContext(
  tokenPercent: number,
  config: WidgetConfig,
  icon: string
): string {
  const format = config.format ?? "compact";
  const options = config.options ?? {};
  const showProgressBar = options.progressBar === true;

  // Add progress bar if enabled (fixed width of 10 characters)
  const progressBar = showProgressBar ? createProgressBar(tokenPercent) : "";

  // Use format with label (only in detailed mode)
  const value = formatWidgetValue(`${tokenPercent}%`, icon, config, {
    short: "",
    long: "ctx",
  });

  if (showProgressBar) {
    return `${progressBar} ${value}`;
  }

  return value;
}

/**
 * Context Widget
 */
export class ContextWidget extends BaseWidget {
  readonly name = "context";
  protected defaultIcon = DEFAULT_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const transcriptPath = input.transcript_path;

    if (!transcriptPath) {
      return "";
    }

    const modelId = extractModelId(input);
    const limit = getContextLimit(modelId);

    const used = await parseTranscriptTokenCount(transcriptPath);

    if (used === 0) {
      return "";
    }

    const percent = calculatePercentage(used, limit);

    const icon = this.getIcon(config);
    return formatContext(percent, config, icon);
  }
}

/**
 * Create a context widget instance
 */
export function createContextWidget(): Widget {
  return new ContextWidget();
}
