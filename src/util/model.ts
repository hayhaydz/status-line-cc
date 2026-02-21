import type { ClaudeCodeInput } from "../types.js";

/**
 * Extract the model ID from Claude Code input.
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
