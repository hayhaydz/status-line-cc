// src/cli/hook-handler.ts
import fs from "fs";
import path from "path";
import { getSessionKey, getStateDir, getSessionDir } from "../util/session.ts";
import { handlePreTool } from "../hooks/pre-tool.ts";
import { handleAgentStart } from "../hooks/agent-start.ts";
import { handleAgentStop } from "../hooks/agent-stop.ts";
import type { HookLogger } from "../util/shared-types.ts";

/**
 * Create a debug logger that writes to session directory.
 */
function createLogger(sessionDir: string): HookLogger {
  const debug = process.env.CLAUDE_HOOK_DEBUG === "1";

  return (action: string, data: Record<string, unknown>) => {
    if (!debug) return;

    const entry = JSON.stringify({ t: Date.now(), action, ...data });
    const logPath = path.join(sessionDir, "debug.log");

    try {
      fs.appendFileSync(logPath, entry + "\n");
    } catch {
      // Ignore logging errors
    }
  };
}

/**
 * Ensure session directory exists and return its path.
 */
function ensureSessionDir(input: Record<string, unknown>): string {
  const sessionKey = getSessionKey(input as any);
  const sessionDir = getSessionDir(sessionKey);

  fs.mkdirSync(sessionDir, { recursive: true });

  return sessionDir;
}

/**
 * Dump raw payload for debugging.
 * Only active when CLAUDE_HOOK_DEBUG=1.
 */
function dumpRawPayload(
  action: string,
  raw: string,
  input: Record<string, unknown>,
  stateDir: string
): void {
  const timestamp = new Date().toISOString();
  const entry = {
    // Metadata
    _meta: {
      timestamp,
      action,
      iso: timestamp,
    },
    // COMPLETE raw input - no filtering
    payload: input,
  };

  const rawDumpPath = path.join(stateDir, "raw-dump.jsonl");
  try {
    fs.appendFileSync(rawDumpPath, JSON.stringify(entry) + "\n");
  } catch {}

  // Also write separate file per hook type for easier analysis
  const perTypePath = path.join(stateDir, `${action}.jsonl`);
  try {
    fs.appendFileSync(perTypePath, JSON.stringify({
      t: Date.now(),
      action,
      // Everything - let analysis tools filter later
      ...input
    }) + "\n");
  } catch {}
}

/**
 * Main hook handler entry point.
 * Reads stdin, routes to appropriate handler.
 * Returns exit code (always 0) instead of calling process.exit directly
 * to allow for in-process testing.
 */
export function handleHook(action: string): number {
  const noop: HookLogger = () => {};
  let log: HookLogger = noop;

  try {
    const raw = fs.readFileSync(0, "utf-8"); // stdin = fd 0
    const input = JSON.parse(raw);

    // Ensure base state directory exists FIRST
    const stateDir = getStateDir();
    fs.mkdirSync(stateDir, { recursive: true });

    // Debug: dump raw payload when CLAUDE_HOOK_DEBUG=1
    if (process.env.CLAUDE_HOOK_DEBUG === "1") {
      dumpRawPayload(action, raw, input, stateDir);
    }

    const sessionDir = ensureSessionDir(input);
    log = createLogger(sessionDir);

    switch (action) {
      case "pre-tool": {
        const response = handlePreTool(input, sessionDir, log);
        // Output response to stdout for Claude Code to process
        console.log(JSON.stringify(response));
        break;
      }
      case "agent-start":
        handleAgentStart(input, sessionDir, log);
        break;
      case "agent-stop":
        handleAgentStop(input, sessionDir, log);
        break;
      default:
        log("unknown-action", { action });
    }
  } catch (e) {
    // Never block Claude Code. Ever.
    log("fatal", { action, error: String(e) });
  }

  // Always return 0 (success) - caller handles process.exit
  return 0;
}
