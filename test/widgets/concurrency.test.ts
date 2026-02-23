/**
 * Concurrency Widget tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { ConcurrencyWidget } from "../../src/widgets/concurrency.ts";
import type { ClaudeCodeInput, Config } from "../../src/types.ts";

// Use /tmp directly to match task-tracker.ts (not os.tmpdir() which differs on macOS)
const TMP_BASE = "/tmp";

describe("ConcurrencyWidget with task tracking", () => {
  const testSessionId = "test-conc-session";
  const testDir = join(TMP_BASE, `claude-sl-${testSessionId}`);

  beforeEach(() => {
    // Clean up and create fresh test directory
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should show model:limit format when no session ID", async () => {
    const input: ClaudeCodeInput = {
      model: "glm-4.7",
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("glm-4.7:5");
  });

  it("should show model:active/limit format when session ID present", async () => {
    // Create a task file for the main model
    writeFileSync(join(testDir, "glm-4.7-call_task1"), "");

    const input: ClaudeCodeInput = {
      model: "glm-4.7",
      session_id: testSessionId,
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("glm-4.7:1/5");
  });

  it("should show 0 active when no tasks for main model", async () => {
    const input: ClaudeCodeInput = {
      model: "glm-4.7",
      session_id: testSessionId,
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("glm-4.7:0/5");
  });

  it("should include subagent models in brackets", async () => {
    // Create task files for main model and subagent
    writeFileSync(join(testDir, "glm-4.7-call_task1"), "");
    writeFileSync(join(testDir, "glm-4.5-call_subtask1"), "");
    writeFileSync(join(testDir, "glm-4.5-call_subtask2"), "");

    const input: ClaudeCodeInput = {
      model: "glm-4.7",
      session_id: testSessionId,
    };

    const globalConfig: Config = {
      concurrencyLimits: {
        "glm-4.7": 5,
        "glm-4.5": 10,
      },
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {}, globalConfig);

    expect(result).toBe("glm-4.7:1/5 [+glm-4.5:2/10]");
  });

  it("should handle multiple subagent model types", async () => {
    // Create task files for main model and multiple subagent types
    writeFileSync(join(testDir, "glm-4.7-call_task1"), "");
    writeFileSync(join(testDir, "glm-4.5-call_subtask1"), "");
    writeFileSync(join(testDir, "glm-4.5-call_subtask2"), "");
    writeFileSync(join(testDir, "glm-5-call_subtask3"), "");

    const input: ClaudeCodeInput = {
      model: "glm-4.7",
      session_id: testSessionId,
    };

    const globalConfig: Config = {
      concurrencyLimits: {
        "glm-4.7": 5,
        "glm-4.5": 10,
        "glm-5": 3,
      },
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {}, globalConfig);

    // Result should contain both subagent models (sorted alphabetically)
    expect(result).toContain("glm-4.7:1/5");
    expect(result).toContain("+glm-4.5:2/10");
    expect(result).toContain("+glm-5:1/3");
    expect(result).toMatch(/^\S+\s\[\+\S+\s\+\S+\]$/);
  });

  it("should return empty string when no model", async () => {
    const input: ClaudeCodeInput = {
      session_id: testSessionId,
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("");
  });

  it("should handle model as object with id", async () => {
    const input: ClaudeCodeInput = {
      model: { id: "glm-4.7", display_name: "GLM-4.7" },
      session_id: testSessionId,
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("glm-4.7:0/5");
  });

  it("should return empty string when model object has no id", async () => {
    const input: ClaudeCodeInput = {
      model: { display_name: "Some Model" },
      session_id: testSessionId,
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("");
  });

  it("should use configured concurrency limits from global config", async () => {
    writeFileSync(join(testDir, "glm-5-call_task1"), "");

    const input: ClaudeCodeInput = {
      model: "glm-5",
      session_id: testSessionId,
    };

    const globalConfig: Config = {
      concurrencyLimits: {
        "glm-5": 3,
        "glm-4.5": 10,
      },
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {}, globalConfig);

    expect(result).toBe("glm-5:1/3");
  });

  it("should use default concurrency for unknown models", async () => {
    const input: ClaudeCodeInput = {
      model: "unknown-model",
      session_id: testSessionId,
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("unknown-model:0/5");
  });

  it("should not show brackets when only main model has tasks", async () => {
    // Only main model tasks
    writeFileSync(join(testDir, "glm-4.7-call_task1"), "");
    writeFileSync(join(testDir, "glm-4.7-call_task2"), "");

    const input: ClaudeCodeInput = {
      model: "glm-4.7",
      session_id: testSessionId,
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("glm-4.7:2/5");
    expect(result).not.toContain("[");
    expect(result).not.toContain("]");
  });

  it("should handle subagent with same model as main (exclude from brackets)", async () => {
    // Main model tasks
    writeFileSync(join(testDir, "glm-4.7-call_task1"), "");
    // "Subagent" with same model should not appear in brackets
    writeFileSync(join(testDir, "glm-4.7-call_subtask1"), "");

    const input: ClaudeCodeInput = {
      model: "glm-4.7",
      session_id: testSessionId,
    };

    const widget = new ConcurrencyWidget();
    const result = await widget.render(input, {});

    // All glm-4.7 tasks are counted in main model active count
    expect(result).toBe("glm-4.7:2/5");
    expect(result).not.toContain("[");
  });
});
