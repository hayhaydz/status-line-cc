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

/**
 * GLM quota limit entry from API
 */
export interface GLMQuotaLimit {
  /** Limit type identifier */
  type: string;

  /** Usage percentage (0-100) */
  percentage: number;

  /** Current usage amount */
  currentUsage?: number;

  /** Total limit (note: API has typo "totol" not "total") */
  totol?: number;

  /** Usage breakdown details */
  usageDetails?: Array<{ modelCode: string; usage: number }>;
}

/**
 * Raw GLM API quota response
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

    const data = await response.json() as RawGLMQuotaResponse;
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
