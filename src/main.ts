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
import { createGitWidget } from "./widgets/git.ts";
import { createModelWidget } from "./widgets/model.ts";
import { createConcurrencyWidget } from "./widgets/concurrency.ts";
import { createContextWidget } from "./widgets/context.ts";
import { createBlockWidget } from "./widgets/block.ts";
import { createGLMWidget } from "./widgets/glm.ts";
import { createCacheWidget } from "./widgets/cache.ts";
import { createWebSearchWidget } from "./widgets/websearch.ts";
import type { ClaudeCodeInput, OutputFormat, Config } from "./types.ts";
import { error as logError } from "./util/logger.ts";
import { handleCliCommand } from "./cli.ts";

/**
 * Register all available widgets
 */
function registerAllWidgets(): void {
  registerWidget(createGitWidget());
  registerWidget(createModelWidget());
  registerWidget(createConcurrencyWidget());
  registerWidget(createContextWidget());
  registerWidget(createBlockWidget());
  registerWidget(createGLMWidget());
  registerWidget(createCacheWidget());
  registerWidget(createWebSearchWidget());
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
 * Parse output format from input or config
 *
 * Returns the format and separator to use for widget rendering.
 * Multi-line format uses newline separator with detailed format.
 */
export function parseOutputFormat(
  input: ClaudeCodeInput,
  configFormat?: OutputFormat
): { format: OutputFormat; separator: string } {
  // Check input output_style first
  if (input.output_style?.name) {
    const style = input.output_style.name.toLowerCase();
    if (style === "multiline") {
      return { format: "detailed", separator: "\n" };
    }
    if (style === "compact" || style === "detailed" || style === "minimal") {
      return { format: style as OutputFormat, separator: " | " };
    }
  }

  // Fall back to config
  const format = configFormat ?? "compact";
  return { format, separator: " | " };
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  // Check for CLI commands first (before reading stdin)
  // Get CLI args, skip bun/node executable and script path
  const cliArgs = process.argv.slice(2);
  const processCwd = process.cwd();

  const cliHandled = await handleCliCommand(cliArgs, processCwd);
  if (cliHandled) {
    // CLI command was handled, exit early
    return;
  }

  // Register all widgets
  registerAllWidgets();

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

  // Parse output format
  const { format, separator } = parseOutputFormat(input, config.format);

  // Render all enabled widgets
  const output = await renderWidgets(
    input,
    config.widgets ?? {},
    format,
    separator, // separator between widgets (newline for multiline, pipe for others)
    config // pass full config for widgets that need global settings
  );

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
