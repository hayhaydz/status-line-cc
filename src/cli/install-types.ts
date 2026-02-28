// src/cli/install-types.ts
/**
 * Types for install/uninstall CLI commands
 */

/** Claude Code settings.json structure */
export interface ClaudeCodeSettings {
  attribution?: {
    commit?: string;
    pr?: string;
  };
  enabledPlugins?: Record<string, boolean>;
  skipDangerousModePermissionPrompt?: boolean;
  model?: string;
  statusLine?: {
    type: "command";
    command: string;
  };
  hooks?: ClaudeHooks;
  [key: string]: unknown; // Allow other fields
}

/** Claude Code hooks structure */
export interface ClaudeHooks {
  PreToolUse?: ClaudeHookEntry[];
  SubagentStart?: ClaudeHookEntry[];
  SubagentStop?: ClaudeHookEntry[];
  [key: string]: ClaudeHookEntry[] | undefined;
}

export interface ClaudeHookEntry {
  matcher: string;
  hooks: ClaudeHook[];
}

export interface ClaudeHook {
  type: "command";
  command: string;
}

/** Install options */
export interface InstallOptions {
  dryRun: boolean;
  force: boolean;
  debug: boolean;
}

/** Uninstall options */
export interface UninstallOptions {
  dryRun: boolean;
  force: boolean;
}

/** Installation result */
export interface InstallResult {
  success: boolean;
  binaryPath: string;
  settingsPath: string;
  backupPath?: string;
  warnings: string[];
  errors: string[];
}

/** Standard paths for installation */
export const INSTALL_PATHS = {
  BINARY_NAME: "statusline-hyz-cc",
  INSTALL_DIR: `${process.env.HOME}/.claude/statusline-hyz-cc.d`,
  SETTINGS_FILE: `${process.env.HOME}/.claude/settings.json`,
  BACKUP_DIR: `${process.env.HOME}/.claude/statusline-hyz-cc.d/backups`,
} as const;
