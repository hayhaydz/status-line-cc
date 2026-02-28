// src/util/session.ts
import { createHash } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Get the base state directory for all sessions.
 * Uses $TMPDIR on macOS (per-user, fast SSD, kernel-cached).
 */
export function getStateDir(): string {
  const tmpBase = process.env.TMPDIR ?? tmpdir() ?? "/tmp";
  const uid = process.getuid?.() ?? process.env.USER ?? "unknown";
  return join(tmpBase, `claude-tasks-${uid}`);
}

interface HookInput {
  session_id?: string;
  env?: { CLAUDE_SESSION_ID?: string };
  parent_pid?: number;
  cwd?: string;
}

/**
 * Get a unique session key from hook input.
 * Resolution chain: session_id → env.CLAUDE_SESSION_ID → parent_pid → cwd
 */
export function getSessionKey(input: HookInput): string {
  const raw =
    input.session_id ??
    input.env?.CLAUDE_SESSION_ID ??
    input.parent_pid?.toString() ??
    input.cwd;

  if (!raw) {
    throw new Error("No session discriminator available");
  }

  return createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

/**
 * Get the full session directory path.
 */
export function getSessionDir(sessionKey: string): string {
  return join(getStateDir(), sessionKey);
}

/**
 * Get standard paths for a session directory.
 * Provides consistent path joining for queue, active, and agent files.
 */
export function getSessionPaths(sessionDir: string) {
  return {
    queue: join(sessionDir, "queue"),
    active: join(sessionDir, "active"),
    activeFile: (agentId: string) => join(sessionDir, "active", `${agentId}.json`),
  };
}
