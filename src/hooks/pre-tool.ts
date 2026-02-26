// src/hooks/pre-tool.ts
import fs from "fs";
import path from "path";
import { extractModel, type PreToolUseInput } from "../util/model.ts";
import { atomicWrite, queueFilename } from "../util/atomic-fs.ts";
import type { HookLogger } from "../util/shared-types.ts";

/**
 * Handle PreToolUse hook event.
 * Extracts model from Task tool input and writes to queue.
 */
export function handlePreTool(input: PreToolUseInput, sessionDir: string, log: HookLogger): void {
  // Only process Task tool
  if (input.tool_name !== "Task") {
    return;
  }

  const model = extractModel(input);

  // Don't track subagents with unknown model - can't display them properly
  if (model === "unknown") {
    log("pre-tool", { skipped: true, reason: "unknown model" });
    return;
  }

  const queueDir = path.join(sessionDir, "queue");
  fs.mkdirSync(queueDir, { recursive: true });

  const filename = queueFilename();
  atomicWrite(
    path.join(queueDir, filename),
    JSON.stringify({ model })
  );

  log("pre-tool", { model, filename });
}
