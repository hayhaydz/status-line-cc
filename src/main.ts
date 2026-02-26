#!/usr/bin/env bun
/**
 * statusline-hyz-cc
 *
 * Lightweight Claude Code CLI status line for GLM Coding Plan users.
 * Reads JSON from stdin, renders widgets, outputs formatted status to stdout.
 */

import { loadConfig } from "./config.ts";
import { configureFromConfig as configureLoggerFromConfig } from "./util/logger.ts";
import { registerWidget, renderWidgets } from "./widget.ts";
import { GitWidget } from "./widgets/git.ts";
import { ModelWidget } from "./widgets/model.ts";
import { ContextWidget } from "./widgets/context.ts";
import { BlockWidget } from "./widgets/block.ts";
import { ToolsWidget } from "./widgets/tools.ts";
import type { ClaudeCodeInput, Config } from "./types.ts";
import { error as logError } from "./util/logger.ts";
import { handleCliCommand, parseCliArgs } from "./cli.ts";
import { cleanStaleDirectories } from "./util/task-tracker.js";
import { handleHook } from "./cli/hook-handler.ts";

/**
 * Register all available widgets
 */
function registerAllWidgets(): void {
  registerWidget(new GitWidget());
  registerWidget(new ModelWidget());
  registerWidget(new ContextWidget());
  registerWidget(new BlockWidget());
  registerWidget(new ToolsWidget());
}

/**
 * Parse JSON input from stdin string
 */
function parseInput(inputStr: string): ClaudeCodeInput | null {
  try {
    return JSON.parse(inputStr) as ClaudeCodeInput;
  } catch (err) {
    logError(`Failed to parse input JSON: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Read stdin completely
 */
async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];

  // Check if stdin is a TTY (interactive) - if so, no input
  if (process.stdin.isTTY) {
    return "{}";
  }

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);
  return buffer.toString("utf-8");
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  // Check for CLI commands first (before reading stdin)
  const cliArgs = process.argv.slice(2);
  const processCwd = process.cwd();

  // Check for --hook flag first (special case - synchronous, always exits)
  const parsed = parseCliArgs(cliArgs);
  if (parsed.command === "hook" && parsed.hookAction) {
    const exitCode = handleHook(parsed.hookAction);
    process.exit(exitCode);
  }

  const cliHandled = await handleCliCommand(cliArgs, processCwd);
  if (cliHandled) {
    return;
  }

  // Register all widgets
  registerAllWidgets();

  // Clean stale directories
  cleanStaleDirectories();

  // Read input from stdin
  const inputStr = await readStdin();
  const input = parseInput(inputStr);

  if (!input) {
    console.log("");
    return;
  }

  // Load configuration
  const cwd = input.cwd ?? input.workspace?.current_dir ?? input.workspace?.project_dir ?? processCwd;
  const config = await loadConfig(cwd);

  // Check if statusline is disabled
  if (config.enabled === false) {
    console.log("");
    return;
  }

  // Configure logger
  configureLoggerFromConfig(config);

  // Render all enabled widgets
  const output = await renderWidgets(input, config.widgets ?? {}, config);

  // Write to stdout
  console.log(output);
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    logError(`Fatal error: ${(error as Error).message}`);
    process.exit(1);
  });
}
