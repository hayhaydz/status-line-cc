// test/hooks/pre-tool.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { handlePreTool } from "../../src/hooks/pre-tool.ts";
import { getStateDir } from "../../src/util/session.ts";

const TEST_SESSION = "test-pre-tool";
const ENV_KEYS = [
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
] as const;
const originalEnv: Record<string, string | undefined> = {};

describe("handlePreTool", () => {
  const sessionDir = join(getStateDir(), TEST_SESSION);

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }

    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
    mkdirSync(sessionDir, { recursive: true });
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  });

  it("writes model to queue directory", () => {
    const input = { tool_name: "Task", tool_input: { model: "claude-sonnet-4-20250514" } };

    handlePreTool(input, sessionDir, () => {});

    const queueDir = join(sessionDir, "queue");
    expect(existsSync(queueDir)).toBe(true);

    const files = readdirSync(queueDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBe(1);

    const content = JSON.parse(readFileSync(join(queueDir, files[0]), "utf-8"));
    expect(content.model).toBe("glm-4.7");
  });

  it("ignores non-Task tools", () => {
    const input = { tool_name: "Read", tool_input: {} };

    handlePreTool(input, sessionDir, () => {});

    const queueDir = join(sessionDir, "queue");
    if (existsSync(queueDir)) {
      const files = readdirSync(queueDir).filter((f) => f.endsWith(".json"));
      expect(files.length).toBe(0);
    }
  });
});
