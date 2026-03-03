// src/util/atomic-fs.ts
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { HookLogger } from "./shared-types.ts";
import { suppress } from "./suppress.ts";

/**
 * Write-then-rename for atomic file creation.
 * Prevents partial writes if process is killed mid-write.
 */
export function atomicWrite(filepath: string, data: string): void {
  const tmp = `${filepath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, filepath);
}

/**
 * Generate unique queue filename with UUID suffix.
 * Format: <timestamp>-<pid>-<uuid>.json
 * Uses crypto.randomUUID() for guaranteed collision resistance.
 */
export function queueFilename(): string {
  const ts = Date.now();
  const uuid = crypto.randomUUID().slice(0, 8); // First 8 chars of UUID
  return `${ts}-${process.pid}-${uuid}.json`;
}

/**
 * Check if a filename is a valid queue entry.
 * Filters out temp files and non-JSON files.
 */
function isQueueEntry(filename: string): boolean {
  return filename.endsWith(".json") && !filename.includes(".tmp");
}

/**
 * Pop from queue with retry on ENOENT.
 * If another hook consumed the entry, try the next one.
 *
 * IMPORTANT: Rename first to establish lock, then read from destination.
 * This prevents TOCTOU race where two processes read the same file
 * before one claims it via rename.
 */
export function popQueue(
  queueDir: string,
  activeDir: string,
  agentId: string,
  log: HookLogger
): string | null {
  // Gracefully handle missing queue directory
  if (!fs.existsSync(queueDir)) {
    log("pop-queue", { error: "queue dir missing", agentId, queueDir });
    return null;
  }

  const entries = fs
    .readdirSync(queueDir)
    .filter(isQueueEntry)
    .sort();

  for (const entry of entries) {
    const src = path.join(queueDir, entry);
    const dest = path.join(activeDir, `${agentId}.json`);

    try {
      // RENAME FIRST - this is our atomic lock
      // If two processes race, only one succeeds
      fs.renameSync(src, dest);

      // Now that we exclusively own 'dest', safely read it
      const data = JSON.parse(fs.readFileSync(dest, "utf-8"));

      // Enrich with metadata after successful claim
      atomicWrite(
        dest,
        JSON.stringify({
          model: data.model,
          hookPid: process.pid,
          parentPid: process.ppid,
          ts: Date.now(),
        })
      );

      return data.model;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "ENOENT") continue; // another hook got it first
      if (e instanceof SyntaxError) {
        // Corrupt file — remove and skip
        suppress(() => fs.unlinkSync(dest));
        log("pop-queue", { entry, error: "corrupt json" });
        continue;
      }
      throw e;
    }
  }

  log("pop-queue", { error: "queue empty", agentId });
  return null;
}
