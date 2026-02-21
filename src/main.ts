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
import type { ClaudeCodeInput, OutputFormat } from "./types.ts";
import { error as logError } from "./util/logger.ts";

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
 */
function parseOutputFormat(
  input: ClaudeCodeInput,
  configFormat?: OutputFormat
): OutputFormat {
  // Check input output_style first
  if (input.output_style?.name) {
    const style = input.output_style.name.toLowerCase();
    if (style === "compact" || style === "detailed" || style === "minimal") {
      return style as OutputFormat;
    }
  }

  // Fall back to config
  return configFormat ?? "compact";
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
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
  const cwd = input.cwd ?? input.workspace?.current_dir ?? input.workspace?.project_dir ?? process.cwd();
  const config = await loadConfig(cwd);

  // Configure logger
  configureLoggerFromConfig(config);

  // Parse output format
  const format = parseOutputFormat(input, config.format);

  // Render all enabled widgets
  const output = await renderWidgets(
    input,
    config.widgets ?? {},
    format,
    " | ", // separator between widgets
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
