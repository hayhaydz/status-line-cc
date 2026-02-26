// src/util/models.ts
/**
 * Shared model extraction logic for hooks and widgets.
 * Maps Claude model names to GLM equivalents via environment variables.
 */

export interface PreToolUseInput {
  tool_name: string;
  tool_input: {
    model?: string;
    task_prompt?: string;
  };
}

/**
 * Map Claude model short names to GLM equivalents via environment variables.
 * Falls back to the short name if env var not set.
 */
const MODEL_TO_GLM: Record<string, string> = {
  opus: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? "glm-5",
  sonnet: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? "glm-4.7",
  haiku: process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? "glm-4.5-air",
};

/**
 * Extract GLM model name from hook input.
 * Maps "claude-sonnet-4-20250514" → "glm-4.7" (via ANTHROPIC_DEFAULT_SONNET_MODEL)
 */
export function extractModel(input: PreToolUseInput): string {
  const raw = input.tool_input?.model ?? "unknown";

  for (const [claudeKey, glmModel] of Object.entries(MODEL_TO_GLM)) {
    if (raw.toLowerCase().includes(claudeKey)) {
      return glmModel;
    }
  }

  // If no mapping found, return as-is (handles glm-* models directly)
  return raw;
}
