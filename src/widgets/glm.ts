/**
 * GLM Quota Widget
 *
 * Fetches and displays GLM Coding Plan quota information.
 * Shows 5-hour block percentage, MCP quota, and web search quota.
 */

import type { Widget, WidgetConfig, ClaudeCodeInput, Config, GLMQuotaResponse } from "../types.js";
import { BaseWidget } from "../widget.ts";
import { getOrCompute } from "../util/cache.ts";
import { debug } from "../util/logger.ts";

/** Default quota icon (Nerd Font pie chart) */
const DEFAULT_ICON = "\uf200"; // nf-cod-pie

/** Default API timeout */
const DEFAULT_TIMEOUT = 5000;

/**
 * Get GLM credentials from config
 */
function getGLMCredentials(config?: Config): { baseUrl: string; authToken: string } {
  const baseUrl = config?.glm?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? "https://api.z.ai/api/anthropic";
  const authToken = config?.glm?.authToken ?? process.env.ANTHROPIC_AUTH_TOKEN ?? "";

  return { baseUrl, authToken };
}

/**
 * Fetch GLM quota from API
 */
async function fetchGLMQuota(config?: Config): Promise<GLMQuotaResponse> {
  const { baseUrl, authToken } = getGLMCredentials(config);

  if (!authToken) {
    return { error: "No auth token configured" };
  }

  const timeout = config?.glm?.timeout ?? DEFAULT_TIMEOUT;
  const ttl = config?.cacheTTL?.glm ?? (5 * 60 * 1000); // 5 minutes default

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `${baseUrl}/monitor/usage/quota/limit`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      debug(`GLM API error: ${response.status} ${errorText}`);
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json() as Record<string, unknown>;

    return {
      timestamp: Date.now(),
      blockUsage: (data.blockUsage as number) ?? 0,
      mcpUsage: (data.mcpUsage as number) ?? 0,
      webUsage: (data.webUsage as number) ?? 0,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as Error).name === "AbortError") {
      return { error: "Request timeout" };
    }

    debug(`GLM fetch failed: ${(error as Error).message}`);
    return { error: (error as Error).message };
  }
}

/**
 * Get cached GLM quota or fetch fresh
 */
async function getGLMQuota(config?: Config): Promise<GLMQuotaResponse> {
  const ttl = config?.cacheTTL?.glm ?? (5 * 60 * 1000);

  return getOrCompute(
    "glm-quota",
    () => fetchGLMQuota(config),
    ttl,
    true // allow stale for background refresh
  );
}

/**
 * Format quota display
 */
function formatQuota(
  quota: GLMQuotaResponse,
  config: WidgetConfig,
  icon: string
): string {
  const format = config.format ?? "compact";

  if (quota.error) {
    // Show error in detailed mode, hide in compact/minimal
    if (format === "detailed") {
      return `${icon}err`;
    }
    return "";
  }

  const blockPercent = quota.blockUsage ?? 0;

  if (format === "minimal") {
    return `${blockPercent}%`;
  }

  const label = format === "detailed" ? "quota" : "";

  return `${icon}${label}:${blockPercent}%`;
}

/**
 * GLM Quota Widget
 */
export class GLMWidget extends BaseWidget {
  readonly name = "glm";
  protected defaultIcon = DEFAULT_ICON;

  async render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string> {
    const quota = await getGLMQuota(globalConfig);

    const icon = this.getIcon(config);
    return formatQuota(quota, config, icon);
  }
}

/**
 * Create a GLM widget instance
 */
export function createGLMWidget(): Widget {
  return new GLMWidget();
}
