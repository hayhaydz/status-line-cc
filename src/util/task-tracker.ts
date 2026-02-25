import { existsSync, readdirSync, lstatSync, rmSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";

/**
 * Directory prefix for Claude status line session directories.
 */
const DIR_PREFIX = "claude-sl-";

/**
 * Base directory for session directories.
 * Uses /tmp directly for compatibility with shell hooks which write to /tmp.
 * Note: On macOS, Node's tmpdir() returns /var/folders/... which is different from /tmp.
 */
const TMP_BASE = "/tmp";

/**
 * Path to the task-tracker.sh script.
 */
const TASK_TRACKER_SCRIPT = `${process.env.HOME}/.claude/statusline-hyz-cc.d/task-tracker.sh`;

/**
 * Stale directory threshold in milliseconds (24 hours).
 */
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Get the session directory path for a given session ID.
 * @param sessionId - The session identifier
 * @returns The absolute path to the session directory
 */
export function getSessionDir(sessionId: string): string {
  return join(TMP_BASE, `${DIR_PREFIX}${sessionId}`);
}

/**
 * Count total active subagent tasks in a session.
 * @param sessionId - The session identifier (unused, kept for API compatibility)
 * @returns The number of active subagent tasks
 */
export function getActiveTaskCount(sessionId: string): number {
  const result = getActiveTasksByModel(sessionId);
  let total = 0;
  for (const count of result.values()) {
    total += count;
  }
  return total;
}

/**
 * Get all active tasks grouped by model.
 * Uses the task-tracker.sh count command which returns "model1:count1,model2:count2" or "0".
 * @param sessionId - The session identifier (unused, kept for API compatibility)
 * @returns A Map where keys are model IDs and values are task counts
 */
export function getActiveTasksByModel(sessionId: string): Map<string, number> {
  const result = new Map<string, number>();

  try {
    // Call task-tracker.sh count to get model counts
    const output = execFileSync(TASK_TRACKER_SCRIPT, ["count"], {
      encoding: "utf-8",
      timeout: 1000,
    }).trim();

    if (output === "0" || output === "") {
      return result;
    }

    // Parse "model1:count1,model2:count2" format
    const pairs = output.split(",");
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(":");
      if (colonIndex > 0) {
        const modelId = pair.slice(0, colonIndex).trim();
        const countStr = pair.slice(colonIndex + 1).trim();
        const count = parseInt(countStr, 10);
        if (!isNaN(count) && count > 0) {
          result.set(modelId, count);
        }
      }
    }

    return result;
  } catch {
    // Script may not exist or failed
    return result;
  }
}

/**
 * Clean up stale session directories older than 24 hours.
 * Only removes directories with the claude-sl- prefix.
 */
export function cleanStaleDirectories(): void {
  const now = Date.now();

  try {
    const entries = readdirSync(TMP_BASE);

    for (const entry of entries) {
      if (!entry.startsWith(DIR_PREFIX)) {
        continue;
      }

      const entryPath = join(TMP_BASE, entry);

      try {
        const stats = lstatSync(entryPath);

        if (now - stats.mtimeMs > STALE_THRESHOLD_MS) {
          rmSync(entryPath, { recursive: true, force: true });
        }
      } catch {
        // Entry may have been deleted or inaccessible, skip it
        continue;
      }
    }
  } catch {
    // tmpdir may be inaccessible, nothing to clean
    return;
  }
}
