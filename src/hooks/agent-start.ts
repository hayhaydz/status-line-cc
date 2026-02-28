// src/hooks/agent-start.ts
import fs from "fs";
import path from "path";
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

  const queueDir = path.join(sessionDir, "queue");
  const activeDir = path.join(sessionDir, "active");
  fs.mkdirSync(activeDir, { recursive: true });

  const model = popQueue(queueDir, activeDir, agentId, log);
  log("agent-start", { agentId, model: model ?? "unknown" });
}
