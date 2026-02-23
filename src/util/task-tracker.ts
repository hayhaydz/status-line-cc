import { existsSync, readdirSync, lstatSync, rmSync } from "fs";
import { join } from "path";

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
 * Delimiter used in task filenames to separate model ID from tool use ID.
 * Format: <model-id>-call_<tool-use-id>
 */
const TASK_DELIMITER = "-call_";

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
 * Count active tasks for a specific model in a session.
 * @param sessionId - The session identifier
 * @param modelId - The model ID to count tasks for
 * @returns The number of active tasks for the model
 */
export function getActiveTaskCount(sessionId: string, modelId: string): number {
  const sessionDir = getSessionDir(sessionId);

  if (!existsSync(sessionDir)) {
    return 0;
  }

  try {
    const files = readdirSync(sessionDir);
    const prefix = `${modelId}${TASK_DELIMITER}`;

    return files.filter((file) => file.startsWith(prefix)).length;
  } catch {
    // Directory may have been deleted between check and read
    return 0;
  }
}

/**
 * Get all active tasks grouped by model.
 * @param sessionId - The session identifier
 * @returns A Map where keys are model IDs and values are task counts
 */
export function getActiveTasksByModel(sessionId: string): Map<string, number> {
  const result = new Map<string, number>();
  const sessionDir = getSessionDir(sessionId);

  if (!existsSync(sessionDir)) {
    return result;
  }

  try {
    const files = readdirSync(sessionDir);

    for (const file of files) {
      const delimiterIndex = file.indexOf(TASK_DELIMITER);
      if (delimiterIndex === -1) {
        continue;
      }

      const modelId = file.slice(0, delimiterIndex);
      const currentCount = result.get(modelId) ?? 0;
      result.set(modelId, currentCount + 1);
    }

    return result;
  } catch {
    // Directory may have been deleted between check and read
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
