// src/hooks/agent-stop.ts
import fs from "fs";
import path from "path";
import type { HookLogger } from "../util/shared-types.ts";

interface AgentStopInput {
  agent_id?: string;
}

/**
 * Handle SubagentStop hook event.
 * Removes active entry.
 */
export function handleAgentStop(input: AgentStopInput, sessionDir: string, log: HookLogger): void {
  const agentId = input.agent_id;
  if (!agentId) {
    log("agent-stop", { error: "missing agent_id" });
    return;
  }

  const fp = path.join(sessionDir, "active", `${agentId}.json`);
  try {
    fs.unlinkSync(fp);
    log("agent-stop", { agentId, status: "removed" });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "ENOENT") {
      log("agent-stop", { agentId, status: "already-gone" });
      return;
    }
    throw e;
  }
}
