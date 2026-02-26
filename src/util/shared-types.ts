/**
 * Shared types and utilities used across the codebase.
 * Consolidates common patterns to reduce duplication.
 */

import type { ClaudeCodeInput } from "../types.js";

/**
 * Logger function type used by hooks.
 * Standardized interface for debug/diagnostic logging.
 */
export type HookLogger = (action: string, data: Record<string, unknown>) => void;

/**
 * Model information for display purposes.
 */
export interface ModelInfo {
  /** Full display name (e.g., "GLM-5", "Opus 4.6") */
  display: string;
  /** Short name for compact display (e.g., "5", "4.7") */
  short: string;
}

/**
 * Check if a widget is enabled.
 * Handles undefined config (defaults to enabled).
 */
export function isWidgetEnabled(config: { enabled?: boolean } | undefined): boolean {
  return config?.enabled !== false;
}

/**
 * Extract working directory from Claude Code input.
 * Resolution chain: cwd -> workspace.current_dir -> workspace.project_dir
 */
export function getWorkingDir(input: ClaudeCodeInput): string | undefined {
  return input.cwd ?? input.workspace?.current_dir ?? input.workspace?.project_dir;
}
