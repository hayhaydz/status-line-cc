/**
 * CLI command handling for easy toggling
 *
 * Provides commands:
 * --help, -h          Show help message
 * --enable            Enable statusline globally
 * --disable           Disable statusline globally
 * --project-disable   Disable statusline for current project
 * --status            Show current status (global + project)
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync as existsSyncSync } from "node:fs";
import { GLOBAL_CONFIG_DIR, GLOBAL_CONFIG_PATH } from "./config.js";

/** Project config file name */
const PROJECT_CONFIG_FILE = ".statusline-hyz-cc.json";

/**
 * Parsed CLI command result
 */
export interface CliCommand {
  command: "help" | "enable" | "disable" | "project-disable" | "status" | null;
}

/**
 * Project-specific config (minimal - just enable/disable)
 */
interface ProjectConfig {
  enabled?: boolean;
}

/**
 * Global config structure
 */
interface GlobalConfig {
  enabled?: boolean;
  [key: string]: unknown;
}

/**
 * Parse command line arguments
 */
export function parseCliArgs(args: string[]): CliCommand {
  if (args.length === 0) {
    return { command: null };
  }

  const arg = args[0];

  switch (arg) {
    case "--help":
    case "-h":
      return { command: "help" };
    case "--enable":
      return { command: "enable" };
    case "--disable":
      return { command: "disable" };
    case "--project-disable":
      return { command: "project-disable" };
    case "--status":
      return { command: "status" };
    default:
      return { command: null };
  }
}

/**
 * Show help message
 */
export function showHelp(): void {
  const help = `
statusline-hyz-cc - Claude Code CLI status line for GLM Coding Plan

USAGE:
  statusline-hyz-cc [FLAGS]

FLAGS:
  --help, -h            Show this help message
  --enable              Enable statusline globally
  --disable             Disable statusline globally
  --project-disable     Disable statusline for current project
  --status              Show current status (global + project)

CONFIGURATION:
  Global config: ~/.claude/statusline-hyz-cc/config.json
  Project config: .statusline-hyz-cc.json (in project root)

When Claude Code passes JSON on stdin (normal operation), all flags are ignored.
Only use these flags when running manually from the terminal.
`.trim();

  console.log(help);
}

/**
 * Ensure global config directory exists
 */
async function ensureGlobalConfigDir(): Promise<void> {
  if (!existsSyncSync(GLOBAL_CONFIG_DIR)) {
    await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
  }
}

/**
 * Read global config (returns empty object if doesn't exist)
 */
async function readGlobalConfig(): Promise<GlobalConfig> {
  try {
    if (!existsSyncSync(GLOBAL_CONFIG_PATH)) {
      return {};
    }

    const content = await readFile(GLOBAL_CONFIG_PATH, "utf-8");
    return JSON.parse(content) as GlobalConfig;
  } catch {
    return {};
  }
}

/**
 * Write global config
 */
async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  await ensureGlobalConfigDir();
  await writeFile(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Enable statusline globally
 */
export async function enableGlobal(): Promise<void> {
  const config = await readGlobalConfig();
  config.enabled = true;
  await writeGlobalConfig(config);
  console.log("Statusline enabled globally.");
}

/**
 * Disable statusline globally
 */
export async function disableGlobal(): Promise<void> {
  const config = await readGlobalConfig();
  config.enabled = false;
  await writeGlobalConfig(config);
  console.log("Statusline disabled globally.");
}

/**
 * Disable statusline for current project
 */
export async function disableProject(cwd: string): Promise<void> {
  const projectConfigPath = join(cwd, PROJECT_CONFIG_FILE);

  const config: ProjectConfig = { enabled: false };
  await writeFile(projectConfigPath, JSON.stringify(config, null, 2), "utf-8");
  console.log(`Statusline disabled for project: ${cwd}`);
}

/**
 * Show current status (global + project)
 */
export async function showStatus(cwd: string): Promise<void> {
  // Read global config
  const globalConfig = await readGlobalConfig();
  const globalEnabled = globalConfig.enabled !== false; // Default is enabled

  console.log(`Global: ${globalEnabled ? "enabled" : "disabled"}`);
  console.log(`Global config: ${GLOBAL_CONFIG_PATH}`);

  // Check project config
  const projectConfigPath = join(cwd, PROJECT_CONFIG_FILE);
  const projectExists = existsSyncSync(projectConfigPath);

  if (projectExists) {
    try {
      const content = await readFile(projectConfigPath, "utf-8");
      const projectConfig = JSON.parse(content) as ProjectConfig;
      const projectEnabled = projectConfig.enabled !== false;
      console.log(`Project: ${projectEnabled ? "enabled" : "disabled"}`);
      console.log(`Project config: ${projectConfigPath}`);
    } catch {
      console.log(`Project: error reading config`);
    }
  } else {
    console.log(`Project: no project config (inherits global setting)`);
  }
}

/**
 * Handle CLI command
 * Returns true if a CLI command was handled (should exit), false otherwise
 */
export async function handleCliCommand(args: string[], cwd: string): Promise<boolean> {
  const { command } = parseCliArgs(args);

  // No CLI command, proceed with normal operation
  if (!command) {
    return false;
  }

  // Handle CLI commands
  switch (command) {
    case "help":
      showHelp();
      return true;
    case "enable":
      await enableGlobal();
      return true;
    case "disable":
      await disableGlobal();
      return true;
    case "project-disable":
      await disableProject(cwd);
      return true;
    case "status":
      await showStatus(cwd);
      return true;
    default:
      return false;
  }
}
