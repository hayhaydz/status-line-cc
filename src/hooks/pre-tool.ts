// src/hooks/pre-tool.ts
import fs from "fs";
import path from "path";
import { extractModel, type PreToolUseInput } from "../util/models.ts";
import { atomicWrite, queueFilename } from "../util/atomic-fs.ts";

type Logger = (action: string, data: Record<string, unknown>) => void;

/**
 * Handle PreToolUse hook event.
 * Extracts model from Task tool input and writes to queue.
 */
export function handlePreTool(input: PreToolUseInput, sessionDir: string, log: Logger): void {
  // Only process Task tool
  if (input.tool_name !== "Task") {
    return;
  }

  const model = extractModel(input);
  const queueDir = path.join(sessionDir, "queue");
  fs.mkdirSync(queueDir, { recursive: true });

  const filename = queueFilename();
  atomicWrite(
    path.join(queueDir, filename),
    JSON.stringify({ model })
  );

  log("pre-tool", { model, filename });
}
