/**
 * Model utilities for extracting and mapping model identifiers.
 * Consolidates model ID extraction and Claude-to-GLM mapping.
 */

import type { ClaudeCodeInput } from "../types.js";

/**
 * Input format for PreToolUse hook.
 */
export interface PreToolUseInput {
  tool_name: string;
  tool_input: {
    model?: string;
    task_prompt?: string;
  };
}

/**
 * Environment-based Claude to GLM model mapping.
 */
function getModelToGlmMap(): Record<string, string> {
  return {
    opus: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? "glm-5",
    sonnet: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? "glm-4.7",
    haiku: process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? "glm-4.5-air",
  };
}

/**
 * Extract the raw model ID from Claude Code input.
 * Handles both string model IDs and object formats.
 */
export function extractModelId(input: ClaudeCodeInput): string | undefined {
  if (!input.model) {
    return undefined;
  }
  if (typeof input.model === "string") {
    return input.model;
  }
  return input.model.id;
}

/**
 * Extract GLM model name from hook input.
 * Maps "claude-sonnet-4-20250514" → "glm-4.7" (via ANTHROPIC_DEFAULT_SONNET_MODEL)
 */
export function extractModel(input: PreToolUseInput): string {
  const raw = input.tool_input?.model ?? "unknown";
  const modelToGlm = getModelToGlmMap();

  for (const [claudeKey, glmModel] of Object.entries(modelToGlm)) {
    if (raw.toLowerCase().includes(claudeKey)) {
      return glmModel;
    }
  }

  // If no mapping found, return as-is (handles glm-* models directly)
  return raw;
}
