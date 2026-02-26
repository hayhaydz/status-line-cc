// src/util/task-tracker.ts
import { existsSync, readdirSync, rmSync, readFileSync, lstatSync } from "fs";
import { join } from "path";
import { getStateDir } from "./session.ts";

/**
 * Active entry format stored in active/ directory.
 */
interface ActiveEntry {
  model: string;
  hookPid: number;
  parentPid: number;
  ts: number;
}

/**
 * Check if a process is still alive.
 *
 * IMPORTANT: This validates the SESSION HOST (Claude Code process), not the
 * individual subagent. If Claude Code stays open for hours, isAlive will
 * return true even if a specific subagent task finished but failed to
 * trigger SubagentStop. The 30-minute TTL fallback mitigates this case.
 */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Stale entry threshold (30 minutes).
 */
const MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Stale queue entry threshold (60 seconds).
 * Queue entries older than this are likely orphaned due to SubagentStart not firing.
 */
const STALE_QUEUE_MS = 60 * 1000;

/**
 * Clean up stale queue entries that were never consumed by agent-start.
 * This handles the case where Claude Code doesn't fire SubagentStart for all agents.
 */
function cleanStaleQueueEntries(sessionKey: string): void {
  const queueDir = join(getStateDir(), sessionKey, "queue");
  if (!existsSync(queueDir)) return;

  const entries = readdirSync(queueDir);
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.endsWith(".json") || entry.includes(".tmp")) continue;

    const fp = join(queueDir, entry);
    try {
      const stat = lstatSync(fp);
      if (now - stat.mtimeMs > STALE_QUEUE_MS) {
        rmSync(fp, { force: true });
      }
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Get all active tasks grouped by model.
 *
 * OPTIMIZED: Single-pass implementation that combines cleanup + counting.
 * 1. Check mtimeMs FIRST (cheap) before reading/parsing JSON (expensive)
 * 2. Only read/parse if file passes age check
 * 3. Tally models in the same loop
 */
export function getActiveTasksByModel(sessionKey: string): Map<string, number> {
  const result = new Map<string, number>();
  const activeDir = join(getStateDir(), sessionKey, "active");

  // Clean up stale queue entries (orphaned when SubagentStart doesn't fire)
  cleanStaleQueueEntries(sessionKey);

  if (!existsSync(activeDir)) return result;

  const entries = readdirSync(activeDir);
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;

    const fp = join(activeDir, entry);
    try {
      const stat = lstatSync(fp);

      // SHORT-CIRCUIT: If too old, delete and skip reading/parsing
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        rmSync(fp, { force: true });
        continue;
      }

      // Recent enough - now read and parse
      const content = readFileSync(fp, "utf-8");
      const data: ActiveEntry = JSON.parse(content);

      // Check process liveness
      if (!isAlive(data.parentPid)) {
        rmSync(fp, { force: true });
        continue;
      }

      // Valid and alive - add to tally
      const count = result.get(data.model) ?? 0;
      result.set(data.model, count + 1);
    } catch {
      // Invalid entry or corrupt JSON, remove it
      try { rmSync(fp, { force: true }); } catch { /* ignore */ }
    }
  }

  return result;
}

/**
 * Count total active subagent tasks.
 */
export function getActiveTaskCount(sessionKey: string): number {
  const result = getActiveTasksByModel(sessionKey);
  let total = 0;
  for (const count of result.values()) {
    total += count;
  }
  return total;
}

/**
 * Directory prefix for Claude status line session directories (legacy).
 */
const DIR_PREFIX = "claude-sl-";

/**
 * Base directory for session directories (legacy).
 */
const TMP_BASE = "/tmp";

/**
 * Stale directory threshold (24 hours).
 */
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Clean up stale session directories older than 24 hours.
 * Kept for backward compatibility with old session dir format.
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
        continue;
      }
    }
  } catch {
    return;
  }
}

/**
 * Legacy function for backward compatibility.
 * Returns path to old-style session directory.
 */
export function getSessionDir(sessionId: string): string {
  return join(TMP_BASE, `${DIR_PREFIX}${sessionId}`);
}
