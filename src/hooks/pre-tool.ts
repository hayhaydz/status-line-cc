// src/hooks/pre-tool.ts
import fs from "fs";
import path from "path";
import { extractModel, type PreToolUseInput } from "../util/model.ts";
import { atomicWrite, queueFilename } from "../util/atomic-fs.ts";
import { getSessionPaths } from "../util/session.ts";
import type { HookLogger, HookResponse } from "../util/shared-types.ts";

/**
 * Tool names that spawn subagents.
 * Claude Code uses "Agent" in hook payloads (may vary by version).
 */
const SUBAGENT_TOOL_NAMES = new Set(["Agent", "Task"]);

/**
 * Handle PreToolUse hook event.
 * Extracts model from Agent/Task tool input and writes to queue.
 * Returns deny response if tool has subagent_type but no model.
 */
export function handlePreTool(
  input: PreToolUseInput,
  sessionDir: string,
  log: HookLogger
): HookResponse {
  // Only track tools that spawn subagents
  if (!SUBAGENT_TOOL_NAMES.has(input.tool_name)) {
    return { decision: "allow" };
  }

  const { subagent_type, model } = input.tool_input;

  // Deny Task calls with subagent_type but no model
  if (subagent_type && !model) {
    log("pre-tool", { denied: true, reason: "missing model" });
    return {
      decision: "deny",
      reason:
        'Task tool requires explicit "model" parameter when using subagent_type. ' +
        "Include the model that best fits this task (e.g., glm-4.7, glm-5, glm-4.5-air).",
    };
  }

  // Extract and validate model
  const extractedModel = extractModel(input);
  if (extractedModel === "unknown") {
    log("pre-tool", { skipped: true, reason: "unknown model" });
    return { decision: "allow" }; // Allow but don't track
  }

  // Write to queue for subagent tracking
  const { queue } = getSessionPaths(sessionDir);
  fs.mkdirSync(queue, { recursive: true });

  const filename = queueFilename();
  atomicWrite(path.join(queue, filename), JSON.stringify({ model: extractedModel }));

  log("pre-tool", { model: extractedModel, filename });
  return { decision: "allow" };
}
