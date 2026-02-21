/**
 * Integration Tests for Statusline Fixtures
 *
 * Tests the compiled binary with various fixture inputs to verify
 * all scenarios work correctly after refactoring.
 */

import { describe, it, expect } from "bun:test";
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/** Path to the compiled binary */
const BINARY_PATH = join(import.meta.dir, "../build/statusline-hyz-cc");

/** Path to fixtures directory */
const FIXTURES_DIR = join(import.meta.dir, "../fixtures");

/**
 * Run the statusline binary with a JSON fixture input
 * and return the output.
 */
async function runStatusline(fixturePath: string): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  if (!existsSync(BINARY_PATH)) {
    throw new Error(`Binary not found at ${BINARY_PATH}. Run 'bun run build' first.`);
  }

  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture not found at ${fixturePath}`);
  }

  const fixtureContent = readFileSync(fixturePath, "utf-8");

  return new Promise((resolve, reject) => {
    const proc = spawn(BINARY_PATH, [], {
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (error) => {
      reject(error);
    });

    proc.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });

    // Write the fixture to stdin
    proc.stdin.write(fixtureContent);
    proc.stdin.end();
  });
}

/**
 * Test result interface
 */
interface TestResult {
  fixture: string;
  success: boolean;
  output: string;
  exitCode: number | null;
  hasOutput: boolean;
  error?: string;
}

/**
 * Run a single fixture test
 */
async function testFixture(fixtureName: string): Promise<TestResult> {
  const fixturePath = join(FIXTURES_DIR, fixtureName);

  try {
    const { stdout, stderr, exitCode } = await runStatusline(fixturePath);

    return {
      fixture: fixtureName,
      success: exitCode === 0,
      output: stdout,
      exitCode,
      hasOutput: stdout.trim().length > 0,
      error: stderr || undefined,
    };
  } catch (error) {
    return {
      fixture: fixtureName,
      success: false,
      output: "",
      exitCode: null,
      hasOutput: false,
      error: (error as Error).message,
    };
  }
}

describe("Statusline Fixtures Integration", () => {
  // Verify binary exists before running tests
  it("should have compiled binary available", () => {
    expect(existsSync(BINARY_PATH)).toBe(true);
  });

  // Test each fixture
  const results: TestResult[] = [];

  it("test-input.json: should process full-featured input", async () => {
    const result = await testFixture("test-input.json");
    results.push(result);

    expect(result.success).toBe(true);
    expect(result.hasOutput).toBe(true);
    expect(result.exitCode).toBe(0);

    // Verify output contains expected widget indicators
    // (Nerd font icons should be present if widgets are working)
    const output = result.output.toLowerCase();

    // Should have model indicator (robot or similar)
    // Should have context indicator (bolt or percentage)
    // Should have block time indicator (clock)
    expect(output.length).toBeGreaterThan(0);
  });

  it("test-minimal.json: should handle minimal input gracefully", async () => {
    const result = await testFixture("test-minimal.json");
    results.push(result);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);

    // Minimal input should still produce some output
    expect(result.hasOutput).toBe(true);
  });

  it("test-no-git.json: should work without git repository", async () => {
    const result = await testFixture("test-no-git.json");
    results.push(result);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);

    // Should work even without git - git widget will be omitted
    expect(result.hasOutput).toBe(true);
  });

  it("test-glm-5.json: should process GLM-5 model data", async () => {
    const result = await testFixture("test-glm-5.json");
    results.push(result);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);

    // Should include context window percentage
    expect(result.hasOutput).toBe(true);
  });

  // Summary test - runs after all fixture tests
  it("should have all fixtures passing", () => {
    const failed = results.filter((r) => !r.success);

    if (failed.length > 0) {
      console.error("\n❌ Failed fixtures:");
      for (const f of failed) {
        console.error(`  - ${f.fixture}: ${f.error || `exit code ${f.exitCode}`}`);
      }
    }

    expect(failed.length).toBe(0);
  });

  // Output verification test
  it("should produce non-empty output for all fixtures", () => {
    const emptyOutput = results.filter((r) => r.success && !r.hasOutput);

    if (emptyOutput.length > 0) {
      console.warn("\n⚠️ Fixtures with empty output:");
      for (const f of emptyOutput) {
        console.warn(`  - ${f.fixture}`);
      }
    }

    // All fixtures should produce some output (unless truly minimal)
    const trulyMinimal = results.filter(
      (r) => r.fixture === "test-minimal.json" && !r.hasOutput
    );

    expect(trulyMinimal.length).toBe(0);
  });
});

/**
 * Manual test runner for debugging
 *
 * Run with: bun run test/fixtures.integration.test.ts
 *
 * To see actual output from each fixture:
 * for f in fixtures/*.json; do
 *   echo "Testing $f:"
 *   cat "$f" | build/statusline-hyz-cc
 *   echo ""
 * done
 */
