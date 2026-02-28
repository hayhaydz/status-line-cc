/**
 * GLM API utility functions
 *
 * Provides shared functionality for querying GLM Coding Plan usage APIs.
 */

import type { Config } from "../types.js";
import { getOrCompute } from "./cache.ts";
import { debug } from "./logger.ts";

/** Default API timeout */
const DEFAULT_TIMEOUT = 5000;

/** HTTP status code to error message mapping */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  401: "Authentication failed - check ANTHROPIC_AUTH_TOKEN",
  429: "Rate limited - too many requests",
  404: "API endpoint not found",
};

/**
 * GLM quota limit entry from API
 */
export interface GLMQuotaLimit {
  /** Limit type identifier */
  type: string;

  /** Usage percentage (0-100) */
  percentage?: number;

  /** Current usage amount */
  currentUsage?: number;

  /** Total limit (note: API has typo "totol" not "total") */
  totol?: number;

  /** Exact timestamp when this limit resets (ms since epoch) */
  nextResetTime?: number;

  /** Usage breakdown details */
  usageDetails?: Array<{ modelCode: string; usage: number }>;
}

/**
 * Raw GLM API quota response (wrapper)
 */
interface GLMAPIWrapper {
  code: number;
  msg: string;
  data: {
    limits: GLMQuotaLimit[];
    level?: string;
  };
  success: boolean;
}

/**
 * Raw GLM API quota response (unwrapped)
 */
export interface RawGLMQuotaResponse {
  limits: GLMQuotaLimit[];
  level?: string;
}

/**
 * Get GLM credentials from config or environment
 */
export function getGLMCredentials(config?: Config): { baseUrl: string; authToken: string } {
  const baseUrl = config?.glm?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? "https://api.z.ai/api/anthropic";
  const authToken = config?.glm?.authToken ?? process.env.ANTHROPIC_AUTH_TOKEN ?? "";

  return { baseUrl, authToken };
}

/**
 * Fetch GLM quota from API
 */
export async function fetchGLMQuota(config?: Config): Promise<RawGLMQuotaResponse | { error: string }> {
  const { baseUrl, authToken } = getGLMCredentials(config);

  if (!authToken) {
    return { error: "No auth token configured" };
  }

  const timeout = config?.glm?.timeout ?? DEFAULT_TIMEOUT;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // GLM quota API uses /api/monitor prefix, not /api/anthropic
    // Parse baseUrl and replace the path suffix
    const baseUrlObj = new URL(baseUrl);
    const url = `${baseUrlObj.origin}/api/monitor/usage/quota/limit`;

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

      // Use lookup for helpful error messages for common status codes
      const errorMessage = HTTP_ERROR_MESSAGES[response.status] ?? `API error: ${response.status}`;
      return { error: errorMessage };
    }

    const wrapped = await response.json() as GLMAPIWrapper;

    // Check for API-level error (even with 200 status)
    if (!wrapped.success || !wrapped.data) {
      // Check for specific error codes
      if (wrapped.code === 1000 || wrapped.msg?.includes("Authentication")) {
        return { error: "Authentication failed - check ANTHROPIC_AUTH_TOKEN" };
      }
      return { error: wrapped.msg || "API returned unsuccessful response" };
    }

    // Unwrap the response
    const data: RawGLMQuotaResponse = {
      limits: wrapped.data.limits,
      level: wrapped.data.level,
    };
    return data;
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
export async function getGLMQuota(config?: Config): Promise<RawGLMQuotaResponse | { error: string }> {
  const ttl = config?.cacheTTL?.glm ?? (5 * 60 * 1000); // 5 minutes default

  return getOrCompute(
    "glm-quota",
    () => fetchGLMQuota(config),
    ttl,
    true // allow stale for background refresh
  );
}

/**
 * Find a specific quota limit by type
 */
export function findQuotaLimit(
  response: RawGLMQuotaResponse | { error: string },
  type: string
): GLMQuotaLimit | undefined {
  if ("error" in response) return undefined;
  return response.limits.find((limit) => limit.type === type);
}

/**
 * Get a specific quota limit by type, handling errors automatically.
 * Returns null if API errors or limit type not found.
 */
export async function getQuotaLimit(
  config: Config | undefined,
  limitType: string
): Promise<GLMQuotaLimit | null> {
  const quota = await getGLMQuota(config);
  if ("error" in quota) return null;
  return findQuotaLimit(quota, limitType) ?? null;
}
