/**
 * Configuration loader with 3-level hierarchy
 *
 * Priority (highest to lowest):
 * 1. Environment variables
 * 2. Project-specific config (~/.claude/statusline-hyz-cc/config.json in cwd)
 * 3. Global config (~/.claude/statusline-hyz-cc/config.json)
 * 4. Built-in defaults
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config, WidgetConfig } from "./types.js";
import { warn } from "./util/logger.js";

/** Default configuration */
const DEFAULTS: Config = {
  format: "compact",
  verbose: false,
  cacheTTL: {
    glm: 5 * 60 * 1000, // 5 minutes
    modelUsage: 15 * 60 * 1000, // 15 minutes
  },
  glm: {
    timeout: 5000, // 5 seconds
  },
  concurrencyLimits: {
    "glm-5": 3,
    "glm-4.7": 5,
    "glm-4.6": 3,
    "glm-4.5": 10,
    "glm-4.5-air": 5,
  },
};

/** Global config file path */
const GLOBAL_CONFIG_PATH = join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".claude",
  "statusline-hyz-cc",
  "config.json"
);

/** Project config directory name */
const PROJECT_CONFIG_DIR = ".statusline-hyz-cc";

/** Project config file name */
const PROJECT_CONFIG_FILE = "config.json";

/**
 * Deep merge two objects (destination takes precedence)
 * Exported for testing
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue) as T[typeof key];
    } else {
      result[key] = sourceValue as T[typeof key];
    }
  }

  return result;
}

/**
 * Load and parse a JSON config file
 */
async function loadConfigFile(path: string): Promise<Partial<Config> | null> {
  try {
    if (!existsSync(path)) {
      return null;
    }

    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as Partial<Config>;
  } catch (error) {
    warn(`Failed to load config file: ${path} - ${(error as Error).message}`);
    return null;
  }
}

/**
 * Find project config path by walking up from cwd
 */
function findProjectConfigPath(startDir: string): string | null {
  let currentDir = startDir;

  // Walk up to 10 levels looking for project config
  for (let i = 0; i < 10; i++) {
    const configPath = join(currentDir, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);

    if (existsSync(configPath)) {
      return configPath;
    }

    const parentDir = dirname(currentDir);

    // Reached root
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}

/**
 * Load environment variable overrides
 */
function loadEnvOverrides(): Partial<Config> {
  const overrides: Partial<Config> = {};

  // Verbose mode
  if (process.env.STATUSLINE_VERBOSE === "1" || process.env.STATUSLINE_VERBOSE === "true") {
    overrides.verbose = true;
  }

  // GLM API config from env
  if (process.env.ANTHROPIC_BASE_URL) {
    overrides.glm = { ...overrides.glm, baseUrl: process.env.ANTHROPIC_BASE_URL };
  }
  if (process.env.ANTHROPIC_AUTH_TOKEN) {
    overrides.glm = { ...overrides.glm, authToken: process.env.ANTHROPIC_AUTH_TOKEN };
  }

  return overrides;
}

/**
 * Load configuration with full hierarchy
 */
export async function loadConfig(cwd?: string): Promise<Config> {
  // Start with defaults
  let config = DEFAULTS;

  // 1. Global config
  const globalConfig = await loadConfigFile(GLOBAL_CONFIG_PATH);
  if (globalConfig) {
    config = deepMerge(config, globalConfig);
  }

  // 2. Project config (if cwd provided)
  if (cwd) {
    const projectConfigPath = findProjectConfigPath(cwd);
    if (projectConfigPath) {
      const projectConfig = await loadConfigFile(projectConfigPath);
      if (projectConfig) {
        config = deepMerge(config, projectConfig);
      }
    }
  }

  // 3. Environment variable overrides (highest priority)
  const envOverrides = loadEnvOverrides();
  if (Object.keys(envOverrides).length > 0) {
    config = deepMerge(config, envOverrides);
  }

  return config;
}

/**
 * Get widget config with defaults
 */
export function getWidgetConfig(
  config: Config,
  widgetName: string,
  defaults: Partial<WidgetConfig> = {}
): WidgetConfig {
  const widgetConfig = config.widgets?.[widgetName] ?? {};

  return {
    enabled: defaults.enabled ?? true,
    format: defaults.format ?? config.format ?? "compact",
    icon: defaults.icon,
    options: defaults.options ?? {},
    ...widgetConfig,
  };
}

/**
 * Get GLM API credentials from config or environment
 */
export function getGLMCredentials(config: Config): {
  baseUrl: string;
  authToken: string;
} {
  const baseUrl = config.glm?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? "https://api.z.ai/api/anthropic";
  const authToken = config.glm?.authToken ?? process.env.ANTHROPIC_AUTH_TOKEN ?? "";

  return { baseUrl, authToken };
}
