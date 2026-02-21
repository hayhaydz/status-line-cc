#!/usr/bin/env bun
/**
 * Block Time Detection Script
 *
 * Empirically detects GLM 5-hour block reset times by polling the API.
 * The script runs for a configurable duration (default 6 hours) and
 * detects when the block percentage drops significantly (indicating a reset).
 *
 * Usage:
 *   bun run scripts/detect-block-times.ts [hours] [--mock]
 *
 * Environment variables required:
 *   ANTHROPIC_BASE_URL - API base URL (default: https://api.z.ai/api/anthropic)
 *   ANTHROPIC_AUTH_TOKEN - Your GLM API token
 *
 * Options:
 *   --mock       Run in mock mode (simulates API responses for testing, 30s polling)
 *
 * Example output saved to scripts/block-times.json:
 *   {
 *     "detectedResets": ["2026-02-21T10:03:00.000Z", ...],
 *     "blockOffsetMinutes": 3,
 *     "suggestedSchedule": ["00:03", "05:03", "10:03", "15:03", "20:03 UTC"],
 *     "lastUpdated": "2026-02-21T10:05:00.000Z"
 *   }
 *
 * NOTE: Polls every 10 minutes to avoid rate limiting. If you get 429 errors,
 * increase POLL_INTERVAL_MS or check if your statusline is also polling the API.
 */

import "dotenv/config";
import { write, argv, sleep } from "bun";
import { fetchGLMQuota } from "../src/util/glm-api.ts";

// ============================================================================
// CONSTANTS
// ============================================================================

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes - don't hammer the API
const MOCK_POLL_INTERVAL_MS = 30 * 1000; // 30 seconds for mock mode testing
const RESET_THRESHOLD_PERCENT = 50;
const FIVE_HOUR_BOUNDARIES = [0, 5, 10, 15, 20] as const;

// Mock mode: simulate blocks that reset at :03 past the hour
const MOCK_BLOCK_OFFSET_MINUTES = 3;

interface PollResult {
  timestamp: string;
  percentage: number;
  isReset: boolean;
}

interface DetectionResults {
  detectedResets: string[];
  blockOffsetMinutes: number;
  suggestedSchedule: string[];
  lastUpdated: string;
}

let partialResults: PollResult[] = [];
let isPolling = false;
let mockMode = false;

/**
 * Simulates API responses in mock mode.
 * Simulates a block that resets at :03 past every 5-hour boundary.
 */
async function getMockBlockPercentage(): Promise<number> {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  // Find the current 5-hour block start time (with mock offset)
  let blockStartHour = FIVE_HOUR_BOUNDARIES[0];
  for (const hour of FIVE_HOUR_BOUNDARIES) {
    if (utcHour >= hour) {
      blockStartHour = hour;
    } else {
      break;
    }
  }

  // Calculate minutes since block start (including offset)
  const blockStartTotalMinutes = blockStartHour * 60 + MOCK_BLOCK_OFFSET_MINUTES;
  const currentTotalMinutes = utcHour * 60 + utcMinute;
  let minutesSinceReset = currentTotalMinutes - blockStartTotalMinutes;

  // Handle negative (we're in the next day's first block)
  if (minutesSinceReset < 0) {
    minutesSinceReset += 24 * 60;
  }

  // Simulate increasing usage as block progresses
  // 5 hours = 300 minutes, so percentage = (minutes / 300) * 100 + some base usage
  const percentage = Math.min(95, Math.floor((minutesSinceReset / 300) * 100) + 5);

  // Simulate a reset every 30 "mock minutes" for demonstration
  // In real 5-minute fast mode, this means about 2.5 minutes between resets
  const mockCycleMinutes = 30;
  const minutesIntoCycle = minutesSinceReset % mockCycleMinutes;

  if (minutesIntoCycle < 5) {
    // Just reset - low percentage
    return 3 + Math.floor(Math.random() * 5);
  } else if (minutesIntoCycle > 25) {
    // About to reset - high percentage
    return 80 + Math.floor(Math.random() * 15);
  } else {
    // Middle of block - moderate percentage
    return 30 + Math.floor((minutesIntoCycle / mockCycleMinutes) * 40);
  }
}

async function getBlockPercentage(): Promise<number | null> {
  if (mockMode) {
    return getMockBlockPercentage();
  }

  const response = await fetchGLMQuota();
  if ("error" in response) {
    console.error(`API error: ${response.error}`);
    return null;
  }
  if (!response.limits || !Array.isArray(response.limits)) {
    console.error(`API error: Invalid response structure (no limits array)`);
    console.error(`Response was:`, JSON.stringify(response));
    return null;
  }
  // API returns type "TOKENS_LIMIT" for the 5-hour block limit
  const blockLimit = response.limits.find((limit) => limit.type === "TOKENS_LIMIT");
  return blockLimit?.percentage ?? null;
}

function detectReset(current: number | null, previous: number | null): boolean {
  if (current === null || previous === null) return false;
  return (previous - current) > RESET_THRESHOLD_PERCENT;
}

/**
 * Uses Bun.write for atomic file operations
 */
async function saveResults(results: DetectionResults, filename: string): Promise<void> {
  try {
    const path = `${import.meta.dir}/${filename}`;
    await write(path, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${path}`);
  } catch (error) {
    console.error(`\n❌ Failed to save: ${(error as Error).message}`);
  }
}

async function savePartialResults(): Promise<void> {
  if (partialResults.length === 0) return;
  console.log("\n\n⚠️ Interrupted! Saving partial results...");
  const analysis = analyzeResets(partialResults);
  await saveResults(analysis, "block-times.json");
}

/**
 * Bun still uses process.on for signals, which is fine!
 */
process.on("SIGINT", async () => {
  if (isPolling) await savePartialResults();
  process.exit(0);
});

async function pollForResets(durationHours: number): Promise<PollResult[]> {
  const results: PollResult[] = [];
  partialResults = results;
  isPolling = true;

  const durationMs = durationHours * 60 * 60 * 1000;
  const startTime = Date.now();
  const endTime = startTime + durationMs;

  let previousPercentage: number | null = null;
  let pollCount = 0;

  while (Date.now() < endTime) {
    pollCount++;
    const now = new Date();
    const timestamp = now.toISOString();

    const progress = (((Date.now() - startTime) / durationMs) * 100).toFixed(1);
    process.stdout.write(`\r[${progress}%] Poll #${pollCount}: ${timestamp.split("T")[1].slice(0, 8)} `);

    const percentage = await getBlockPercentage();

    if (percentage !== null) {
      const isReset = detectReset(percentage, previousPercentage);
      if (isReset) console.log(`\n🔄 RESET DETECTED! ${percentage}%`);
      
      results.push({ timestamp, percentage, isReset });
      previousPercentage = percentage;
    }

    if (Date.now() < endTime) {
      // Bun.sleep is optimized for the event loop
      const interval = mockMode ? MOCK_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
      await sleep(interval);
    }
  }

  isPolling = false;
  return results;
}

function analyzeResets(results: PollResult[]): DetectionResults {
  const resetEvents = results.filter((r) => r.isReset);
  
  if (resetEvents.length === 0) {
    return {
      detectedResets: [],
      blockOffsetMinutes: 0,
      suggestedSchedule: ["00:00", "05:00", "10:00", "15:00", "20:00 UTC"],
      lastUpdated: new Date().toISOString(),
    };
  }

  const offsets = resetEvents.map(reset => {
    const resetTime = new Date(reset.timestamp);
    const utcHour = resetTime.getUTCHours();
    const utcMinute = resetTime.getUTCMinutes();
    const nearestBoundary = FIVE_HOUR_BOUNDARIES.reduce((prev, curr) => 
      Math.abs(curr - utcHour) < Math.abs(prev - utcHour) ? curr : prev
    );
    return (utcHour - nearestBoundary) * 60 + utcMinute;
  });

  const medianOffset = offsets.sort((a, b) => a - b)[Math.floor(offsets.length / 2)];
  const suggestedSchedule = FIVE_HOUR_BOUNDARIES.map((hour) => {
    const totalMinutes = hour * 60 + medianOffset;
    return `${Math.floor(totalMinutes / 60).toString().padStart(2, "0")}:${(totalMinutes % 60).toString().padStart(2, "0")} UTC`;
  });

  return {
    detectedResets: resetEvents.map((r) => r.timestamp),
    blockOffsetMinutes: medianOffset,
    suggestedSchedule,
    lastUpdated: new Date().toISOString(),
  };
}

async function main() {
  // Parse command line arguments
  const args = argv.slice(2);
  let durationHours = 6; // default

  for (const arg of args) {
    if (arg === "--mock") {
      mockMode = true;
    } else if (!arg.startsWith("--")) {
      durationHours = parseFloat(arg);
    }
  }

  if (mockMode) {
    console.log("\n🧪 Running in MOCK mode (simulated API responses, 30s polling)");
  }

  console.log("\n🚀 GLM Block Detection (Bun Native)");
  console.log(`📊 Duration: ${durationHours} hour(s)`);

  const results = await pollForResets(durationHours);
  const analysis = analyzeResets(results);
  await saveResults(analysis, mockMode ? "block-times-mock.json" : "block-times.json");
  console.log("\n✨ Done.");
}

main();