// src/util/models.ts
/**
 * Shared model extraction logic for hooks and widgets.
 * This is the DRY win of moving to TypeScript.
 */

export interface PreToolUseInput {
  tool_name: string;
  tool_input: {
    model?: string;
    task_prompt?: string;
  };
}

const MODEL_SHORT_NAMES: Record<string, string> = {
  opus: "opus",
  sonnet: "sonnet",
  haiku: "haiku",
};

/**
 * Extract a short model name from hook input.
 * Normalizes "claude-sonnet-4-20250514" → "sonnet"
 */
export function extractModel(input: PreToolUseInput): string {
  const raw = input.tool_input?.model ?? "unknown";

  for (const [key, short] of Object.entries(MODEL_SHORT_NAMES)) {
    if (raw.toLowerCase().includes(key)) {
      return short;
    }
  }

  return raw;
}
