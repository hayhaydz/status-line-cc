// test/hooks/agent-stop.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { handleAgentStop } from "../../src/hooks/agent-stop.ts";
import { getStateDir } from "../../src/util/session.ts";

const TEST_SESSION = "test-agent-stop";

describe("handleAgentStop", () => {
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

  it("removes active entry", () => {
    // Set up active entry
    const activeDir = join(sessionDir, "active");
    mkdirSync(activeDir, { recursive: true });
    writeFileSync(join(activeDir, "agent-123.json"), '{"model":"opus"}');

    const input = { agent_id: "agent-123" };
    handleAgentStop(input, sessionDir, () => {});

    expect(existsSync(join(activeDir, "agent-123.json"))).toBe(false);
  });

  it("handles missing file gracefully", () => {
    const input = { agent_id: "non-existent" };
    let logged = false;

    handleAgentStop(input, sessionDir, () => { logged = true; });

    // Should not throw, just log
    expect(logged).toBe(true);
  });

  it("handles missing agent_id gracefully", () => {
    const input = {};
    let logged = false;

    handleAgentStop(input, sessionDir, () => { logged = true; });

    expect(logged).toBe(true);
  });
});
