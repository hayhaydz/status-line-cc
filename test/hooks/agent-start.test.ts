// test/hooks/agent-start.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { handleAgentStart } from "../../src/hooks/agent-start.ts";
import { getStateDir } from "../../src/util/session.ts";

const TEST_SESSION = "test-agent-start";

describe("handleAgentStart", () => {
  const sessionDir = join(getStateDir(), TEST_SESSION);

  beforeEach(() => {
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
    mkdirSync(sessionDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  });

  it("creates active entry from queue", () => {
    // Set up queue with a model
    const queueDir = join(sessionDir, "queue");
    mkdirSync(queueDir, { recursive: true });
    writeFileSync(join(queueDir, "1000-100-abc.json"), '{"model":"opus"}');

    const input = { agent_id: "agent-123" };
    handleAgentStart(input, sessionDir, () => {});

    const activeFile = join(sessionDir, "active", "agent-123.json");
    expect(existsSync(activeFile)).toBe(true);

    const content = JSON.parse(readFileSync(activeFile, "utf-8"));
    expect(content.model).toBe("opus");
    expect(content.parentPid).toBe(process.ppid);
  });

  it("handles missing agent_id gracefully", () => {
    const input = {};
    let logged = false;

    handleAgentStart(input, sessionDir, () => { logged = true; });

    expect(logged).toBe(true);
  });
});
