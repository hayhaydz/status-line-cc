// src/hooks/agent-start.ts
import fs from "fs";
import { getSessionPaths } from "../util/session.ts";
import { popQueue } from "../util/atomic-fs.ts";
import type { HookLogger } from "../util/shared-types.ts";

interface AgentStartInput {
  agent_id?: string;
  [key: string]: unknown; // Accept any fields - we'll log everything
}

/**
 * Handle SubagentStart hook event.
 * Pops model from queue and creates active entry.
 */
export function handleAgentStart(input: AgentStartInput, sessionDir: string, log: HookLogger): void {
  const agentId = input.agent_id;
  if (!agentId) {
    log("agent-start", { error: "missing agent_id" });
    return;
  }

  const { queue, active } = getSessionPaths(sessionDir);
  fs.mkdirSync(active, { recursive: true });

  const model = popQueue(queue, active, agentId, log);
  log("agent-start", { agentId, model: model ?? "unknown" });
}
