/**
 * Git Status Widget
 *
 * Displays current branch name and counts of staged/modified files.
 * Uses execFile for safe git command execution.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { WidgetConfig, ClaudeCodeInput, GitStatus, Config } from "../types.js";
import { BaseWidget } from "../widget.js";
import { debug } from "../util/logger.js";
import { getWorkingDir } from "../util/shared-types.js";

const execFileAsync = promisify(execFile);

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

  // Get untracked files count
  const untracked = await execGit(["ls-files", "--others", "--exclude-standard"], cwd);
  const untrackedCount = untracked ? untracked.split("\n").filter(Boolean).length : 0;

  return {
    branch,
    staged: stagedCount,
    modified: modifiedCount,
    untracked: untrackedCount,
    isDirty: stagedCount > 0 || modifiedCount > 0 || untrackedCount > 0,
  };
}

/**
 * Git Status Widget
 */
export class GitWidget extends BaseWidget {
  readonly name = "git";

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string | null> {
    const cwd = getWorkingDir(input);

    const status = await getGitStatus(cwd);

    if (!status) {
      return null; // Not in a git repo
    }

    if (!status.isDirty) {
      return null;
    }

    const totalChanges = status.staged + status.modified + status.untracked;
    return `*${totalChanges}`;
  }
}
