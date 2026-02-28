// src/hooks/pre-tool.ts
import fs from "fs";
import path from "path";
import { extractModel, type PreToolUseInput } from "../util/model.ts";
import { atomicWrite, queueFilename } from "../util/atomic-fs.ts";
import type { HookLogger, HookResponse } from "../util/shared-types.ts";

/**
 * Handle PreToolUse hook event.
 * Extracts model from Task tool input and writes to queue.
 * Returns deny response if Task has subagent_type but no model.
 */
export function handlePreTool(
  input: PreToolUseInput,
  sessionDir: string,
  log: HookLogger
): HookResponse {
  // Allow non-Task tools
  if (input.tool_name !== "Task") {
    return { decision: "allow" };
  }

  const { subagent_type, model } = input.tool_input;

  // WIDE NET: Log complete input structure - analysis happens later
  log("pre-tool-raw", { input });

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
  const queueDir = path.join(sessionDir, "queue");
  fs.mkdirSync(queueDir, { recursive: true });

  const filename = queueFilename();
  atomicWrite(path.join(queueDir, filename), JSON.stringify({ model: extractedModel }));

  log("pre-tool", { model: extractedModel, filename });
  return { decision: "allow" };
}
