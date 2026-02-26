import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { ModelWidget } from "../../src/widgets/model.ts";
import type { ClaudeCodeInput } from "../../src/types.ts";
import { getSessionDir, getSessionKey } from "../../src/util/session.ts";

const MULTIPLIER_ENV = "STATUSLINE_GLM5_MULTIPLIER";
const SESSION_ID = "test-model-widget-session";

function cleanSessionDir(): void {
  const sessionKey = getSessionKey({ session_id: SESSION_ID });
  const sessionDir = getSessionDir(sessionKey);
  if (existsSync(sessionDir)) {
    rmSync(sessionDir, { recursive: true, force: true });
  }
}

describe("ModelWidget", () => {
  const originalMultiplier = process.env[MULTIPLIER_ENV];

  beforeEach(() => {
    delete process.env[MULTIPLIER_ENV];
    cleanSessionDir();
  });

  afterEach(() => {
    if (originalMultiplier === undefined) {
      delete process.env[MULTIPLIER_ENV];
    } else {
      process.env[MULTIPLIER_ENV] = originalMultiplier;
    }
    cleanSessionDir();
  });

  it("shows GLM-5 at 3x when forced to peak", async () => {
    process.env[MULTIPLIER_ENV] = "3";
    const widget = new ModelWidget();
    const input: ClaudeCodeInput = { model: "glm-5" };

    const result = await widget.render(input, {});

    expect(result).toBe("GLM-5 3x");
  });

  it("shows GLM-5 at 2x when forced to off-peak", async () => {
    process.env[MULTIPLIER_ENV] = "2";
    const widget = new ModelWidget();
    const input: ClaudeCodeInput = { model: "glm-5" };

    const result = await widget.render(input, {});

    expect(result).toBe("GLM-5 2x");
  });

  it("shows non-GLM-5 models at 1x", async () => {
    const widget = new ModelWidget();
    const input: ClaudeCodeInput = { model: "glm-4.7" };

    const result = await widget.render(input, {});

    expect(result).toBe("GLM-4.7 1x");
  });

  it("shows grouped subagents with multiplier and active count", async () => {
    process.env[MULTIPLIER_ENV] = "3";

    const sessionKey = getSessionKey({ session_id: SESSION_ID });
    const activeDir = join(getSessionDir(sessionKey), "active");
    mkdirSync(activeDir, { recursive: true });

    writeFileSync(
      join(activeDir, "g5-1.json"),
      JSON.stringify({ model: "glm-5", parentPid: process.pid, hookPid: process.pid, ts: Date.now() })
    );
    writeFileSync(
      join(activeDir, "g47-1.json"),
      JSON.stringify({ model: "glm-4.7", parentPid: process.pid, hookPid: process.pid, ts: Date.now() })
    );

    const widget = new ModelWidget();
    const input: ClaudeCodeInput = { session_id: SESSION_ID, model: "glm-4.5-air" };
    const config = {
      concurrencyLimits: {
        "glm-5": 3,
        "glm-4.7": 3,
        "glm-4.5-air": 5,
      },
    };

    const result = await widget.render(input, {}, config);

    expect(result).toContain("GLM-4.5-air 1x");
    expect(result).toContain("+4.7_1x:1/3");
    expect(result).toContain("+5_3x:1/3");
  });
});
