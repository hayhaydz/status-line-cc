/**
 * Git Status Widget
 *
 * Displays current branch name and counts of staged/modified files.
 * Uses execFile for safe git command execution.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Widget, WidgetConfig, ClaudeCodeInput, GitStatus, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { debug } from "../util/logger.js";

const execFileAsync = promisify(execFile);

/** Default git icons */
const DEFAULT_ICON = "\u{f02a2}";      // Nerd Font: nf-oct-git_branch
const TEXT_CONTENT_ICON = "g:";          // Text mode
const EMOJI_ICON = "🌿";                 // Emoji: herb

/**
 * Execute a git command safely using execFile
 */
async function execGit(args: string[], cwd?: string, timeout = 200): Promise<string> {
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      timeout,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    return result.stdout.trim();
  } catch (error) {
    // Git command failed (likely not in a git repo)
    debug(`Git command failed: ${args.join(" ")} - ${(error as Error).message}`);
    return "";
  }
}

/**
 * Get current git status information
 */
async function getGitStatus(cwd?: string): Promise<GitStatus | null> {
  // Get current branch
  const branch = await execGit(["branch", "--show-current"], cwd);
  if (!branch) {
    return null; // Not in a git repo
  }

  // Get staged files count
  const staged = await execGit(["diff", "--cached", "--name-only"], cwd);
  const stagedCount = staged ? staged.split("\n").filter(Boolean).length : 0;

  // Get modified files count (excluding staged)
  const modified = await execGit(["diff", "--name-only"], cwd);
  const modifiedCount = modified ? modified.split("\n").filter(Boolean).length : 0;

  return {
    branch,
    staged: stagedCount,
    modified: modifiedCount,
    isDirty: stagedCount > 0 || modifiedCount > 0,
  };
}

/**
 * Format git status for display
 */
function formatGitStatus(
  status: GitStatus,
  config: WidgetConfig,
  icon: string,
  colorFn?: (text: string) => string
): string {
  const format = config.format ?? "compact";

  // Apply icon + color
  const coloredIcon = colorFn ? colorFn(icon) : icon;
  const branchStr = `${coloredIcon}${status.branch}`;

  if (format === "minimal") {
    return status.isDirty ? `${branchStr} *` : branchStr;
  }

  const parts = [branchStr];

  if (status.staged > 0) {
    parts.push(`+${status.staged}`);
  }

  if (status.modified > 0) {
    parts.push(`*${status.modified}`);
  }

  return parts.join(" ");
}

/**
 * Git Status Widget
 */
export class GitWidget extends BaseWidget {
  readonly name = "git";
  protected defaultIcon = DEFAULT_ICON;
  protected textContentIcon = TEXT_CONTENT_ICON;
  protected emojiIcon = EMOJI_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const cwd = input.cwd ?? input.workspace?.current_dir ?? input.workspace?.project_dir;

    const status = await getGitStatus(cwd);

    if (!status) {
      return ""; // Not in a git repo
    }

    const icon = this.getIcon(config, globalConfig);
    const colorFn = (text: string) => this.formatWithColor(text, globalConfig);

    return formatGitStatus(status, config, icon, colorFn);
  }
}
