// test/cli/hook-handler.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { getStateDir } from "../../src/util/session.ts";

const TEST_SESSION = "test-hook-handler";

describe("hook-handler CLI", () => {
  const sessionDir = join(getStateDir(), TEST_SESSION);

  beforeEach(() => {
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  });

  // Note: Full integration tests would spawn the binary
  // Here we test the handler function directly
});

describe("hook-handler stdout", () => {
  const stateDir = getStateDir();

  beforeEach(() => {
    if (existsSync(stateDir)) {
      rmSync(stateDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(stateDir)) {
      rmSync(stateDir, { recursive: true, force: true });
    }
  });

  it("outputs deny JSON to stdout when model missing", () => {
    const input = JSON.stringify({
      session_id: "test-session",
      cwd: "/tmp",
      tool_name: "Task",
      tool_input: {
        subagent_type: "code-simplifier:code-simplifier",
        prompt: "test"
      }
    });

    // Use spawnSync with array args (safer than execSync with string interpolation)
    const result = spawnSync("bun", ["run", "src/main.ts", "--hook", "pre-tool"], {
      input: input,
      encoding: "utf-8",
      cwd: process.cwd()
    });

    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.decision).toBe("deny");
    expect(parsed.reason).toContain("model");
  });

  it("outputs allow JSON to stdout when model present", () => {
    const input = JSON.stringify({
      session_id: "test-session",
      cwd: "/tmp",
      tool_name: "Task",
      tool_input: {
        subagent_type: "code-simplifier:code-simplifier",
        model: "glm-4.7",
        prompt: "test"
      }
    });

    const result = spawnSync("bun", ["run", "src/main.ts", "--hook", "pre-tool"], {
      input: input,
      encoding: "utf-8",
      cwd: process.cwd()
    });

    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.decision).toBe("allow");
  });
});
