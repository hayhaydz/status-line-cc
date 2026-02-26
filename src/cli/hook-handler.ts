// src/cli/hook-handler.ts
import fs from "fs";
import path from "path";
import { getSessionKey, getStateDir, getSessionDir } from "../util/session.ts";
import { handlePreTool } from "../hooks/pre-tool.ts";
import { handleAgentStart } from "../hooks/agent-start.ts";
import { handleAgentStop } from "../hooks/agent-stop.ts";

type Logger = (action: string, data: Record<string, unknown>) => void;

/**
 * Create a debug logger that writes to session directory.
 */
function createLogger(sessionDir: string): Logger {
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
 * Main hook handler entry point.
 * Reads stdin, routes to appropriate handler.
 * Returns exit code (always 0) instead of calling process.exit directly
 * to allow for in-process testing.
 */
export function handleHook(action: string): number {
  const noop: Logger = () => {};
  let log: Logger = noop;

  try {
    const raw = fs.readFileSync(0, "utf-8"); // stdin = fd 0
    const input = JSON.parse(raw);

    // Debug: log to global file (always, for troubleshooting)
    if (process.env.CLAUDE_HOOK_DEBUG === "1") {
      const sessionKey = getSessionKey(input as any);
      const debugEntry = JSON.stringify({
        t: Date.now(),
        action,
        session_id: (input as any).session_id,
        cwd: (input as any).cwd,
        parent_pid: (input as any).parent_pid,
        sessionKey
      }) + "\n";
      const globalLogPath = path.join(getStateDir(), "hook-inputs.log");
      try {
        fs.appendFileSync(globalLogPath, debugEntry);
      } catch {}
      console.error(`[hook ${action}] session_id=${(input as any).session_id} sessionKey=${sessionKey}`);
    }

    const sessionDir = ensureSessionDir(input);
    log = createLogger(sessionDir);

    switch (action) {
      case "pre-tool":
        handlePreTool(input, sessionDir, log);
        break;
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
