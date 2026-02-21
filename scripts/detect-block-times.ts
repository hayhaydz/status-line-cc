#!/usr/bin/env bun
/**
 * Block Time Detection Script
 *
 * Empirically detects GLM 5-hour block reset times by polling the API.
 * The script runs for a configurable duration (default 6 hours) and
 * detects when the block percentage drops significantly (indicating a reset).
 *
 * Usage:
 *   bun run scripts/detect-block-times.ts [hours]
 *
 * Environment variables required:
 *   ANTHROPIC_BASE_URL - API base URL (default: https://api.z.ai/api/anthropic)
 *   ANTHROPIC_AUTH_TOKEN - Your GLM API token
 *
 * Example output saved to scripts/block-times.json:
 *   {
 *     "detectedResets": ["2026-02-21T10:03:00.000Z", ...],
 *     "blockOffsetMinutes": 3,
 *     "suggestedSchedule": ["00:03", "05:03", "10:03", "15:03", "20:03 UTC"],
 *     "lastUpdated": "2026-02-21T10:05:00.000Z"
 *   }
 */

import { writeFile } from "node:fs/promises";

/** API response structure */
interface QuotaResponse {
  limits: Array<{
    type: string;
    percentage: number;
  }>;
}

/** Poll result with timestamp and percentage */
interface PollResult {
  timestamp: string;
  percentage: number;
  isReset: boolean;
}

/** Final analysis results */
interface DetectionResults {
  detectedResets: string[];
  blockOffsetMinutes: number;
  suggestedSchedule: string[];
  lastUpdated: string;
}

/** Get API credentials from environment */
function getCredentials(): { baseUrl: string; authToken: string } {
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.z.ai/api/anthropic";
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN ?? "";

  if (!authToken) {
    console.error("Error: ANTHROPIC_AUTH_TOKEN environment variable is required");
    process.exit(1);
  }

  return { baseUrl, authToken };
}

/**
 * Fetch current block percentage from GLM API
 */
async function getBlockPercentage(): Promise<number | null> {
  const { baseUrl, authToken } = getCredentials();

  try {
    const url = `${baseUrl}/api/monitor/usage/quota/limit`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as QuotaResponse;
    const blockLimit = data.limits.find((limit) => limit.type === "Token usage(5 Hour)");

    return blockLimit?.percentage ?? null;
  } catch (error) {
    console.error(`Fetch failed: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Detect if a reset occurred based on percentage drop
 * A reset is detected when percentage drops by more than 50%
 */
function detectReset(current: number | null, previous: number | null): boolean {
  if (current === null || previous === null) {
    return false;
  }

  // Reset detected if percentage dropped by more than 50%
  const drop = previous - current;
  return drop > 50;
}

/**
 * Poll the API for block percentage over time
 */
async function pollForResets(durationHours: number): Promise<PollResult[]> {
  const results: PollResult[] = [];
  const pollInterval = 2 * 60 * 1000; // 2 minutes
  const duration = durationHours * 60 * 60 * 1000;
  const startTime = Date.now();
  const endTime = startTime + duration;

  console.log(`\n🔍 Starting block time detection...`);
  console.log(`   Duration: ${durationHours} hours`);
  console.log(`   Poll interval: 2 minutes`);
  console.log(`   Expected polls: ~${Math.floor(duration / pollInterval)}`);
  console.log(`\nPress Ctrl+C to stop early and save results.\n`);

  let previousPercentage: number | null = null;
  let pollCount = 0;

  while (Date.now() < endTime) {
    pollCount++;

    const now = new Date();
    const timestamp = now.toISOString();

    // Show progress
    const elapsed = Date.now() - startTime;
    const progress = ((elapsed / duration) * 100).toFixed(1);
    process.stdout.write(`\r[${progress}%] Poll #${pollCount}: ${timestamp.split("T")[1].slice(0, 8)} `);

    const percentage = await getBlockPercentage();

    if (percentage !== null) {
      const isReset = detectReset(percentage, previousPercentage);

      if (isReset) {
        console.log(`\n🔄 RESET DETECTED! ${percentage}% (was ${previousPercentage}%)`);
      } else if (previousPercentage === null) {
        console.log(`\n📊 Initial: ${percentage}%`);
      }

      results.push({
        timestamp,
        percentage,
        isReset,
      });

      previousPercentage = percentage;
    } else {
      console.log(`\n⚠️  Failed to fetch percentage`);
    }

    // Wait for next poll (unless we're done)
    if (Date.now() < endTime) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  console.log(`\n\n✅ Polling complete. Collected ${results.length} data points.`);
  return results;
}

/**
 * Analyze poll results to find block offset from 5-hour boundaries
 */
function analyzeResets(results: PollResult[]): DetectionResults {
  const resetEvents = results.filter((r) => r.isReset);

  if (resetEvents.length === 0) {
    console.warn("\n⚠️  No resets detected during polling period.");
    console.warn("   This could mean:");
    console.warn("   - The polling period was too short");
    console.warn("   - Blocks reset at different times than expected");
    console.warn("   - API quota wasn't being used during the period");

    return {
      detectedResets: [],
      blockOffsetMinutes: 0,
      suggestedSchedule: ["00:00", "05:00", "10:00", "15:00", "20:00 UTC"],
      lastUpdated: new Date().toISOString(),
    };
  }

  console.log(`\n📈 Analyzing ${resetEvents.length} reset events...`);

  // Calculate offset from expected 5-hour boundaries (00:00, 05:00, 10:00, 15:00, 20:00)
  const offsets: number[] = [];

  for (const reset of resetEvents) {
    const resetTime = new Date(reset.timestamp);
    const utcHour = resetTime.getUTCHours();
    const utcMinute = resetTime.getUTCMinutes();

    // Find the nearest 5-hour boundary
    const boundaries = [0, 5, 10, 15, 20];
    let nearestBoundary = 0;

    for (const boundary of boundaries) {
      if (Math.abs(utcHour - boundary) <= 2) {
        nearestBoundary = boundary;
        break;
      }
    }

    // Calculate offset in minutes
    const hourDiff = utcHour - nearestBoundary;
    const offsetMinutes = hourDiff * 60 + utcMinute;
    offsets.push(offsetMinutes);

    console.log(`   ${reset.timestamp.slice(0, 16)}Z -> offset: ${offsetMinutes} min from ${nearestBoundary}:00`);
  }

  // Calculate median offset
  const sortedOffsets = [...offsets].sort((a, b) => a - b);
  const medianOffset = sortedOffsets[Math.floor(sortedOffsets.length / 2)];

  // Generate suggested schedule
  const boundaries = [0, 5, 10, 15, 20];
  const suggestedSchedule = boundaries.map((hour) => {
    const totalMinutes = hour * 60 + medianOffset;
    const scheduleHour = Math.floor(totalMinutes / 60) % 24;
    const scheduleMinute = totalMinutes % 60;
    return `${scheduleHour.toString().padStart(2, "0")}:${scheduleMinute.toString().padStart(2, "0")}`;
  });

  console.log(`\n🎯 Median offset: ${medianOffset} minutes`);
  console.log(`📅 Suggested schedule: ${suggestedSchedule.join(", ")} UTC`);

  return {
    detectedResets: resetEvents.map((r) => r.timestamp),
    blockOffsetMinutes: medianOffset,
    suggestedSchedule: suggestedSchedule.map((s) => `${s} UTC`),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save results to JSON file
 */
async function saveResults(results: DetectionResults, filepath: string): Promise<void> {
  try {
    await writeFile(filepath, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\n💾 Results saved to: ${filepath}`);
  } catch (error) {
    console.error(`\n❌ Failed to save results: ${(error as Error).message}`);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Parse duration from CLI args
  const hoursArg = process.argv[2];
  const durationHours = hoursArg ? parseInt(hoursArg, 10) : 6;

  if (isNaN(durationHours) || durationHours < 1) {
    console.error("Error: Duration must be a positive number of hours");
    console.error("Usage: bun run scripts/detect-block-times.ts [hours]");
    process.exit(1);
  }

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║       GLM Block Time Detection Script                  ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  // Run polling
  const results = await pollForResets(durationHours);

  // Analyze results
  const analysis = analyzeResets(results);

  // Save to file
  const outputPath = new URL("block-times.json", import.meta.url);
  await saveResults(analysis, outputPath.pathname);

  console.log("\n✨ Detection complete!");
}

// Run the script
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
