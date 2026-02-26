import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  getActiveTaskCount,
  getActiveTasksByModel,
  cleanStaleDirectories,
  isAlive,
} from "../../src/util/task-tracker.ts";
import { getSessionDir } from "../../src/util/session.ts";
import { existsSync, mkdirSync, rmSync, writeFileSync, lstatSync } from "fs";
import { join } from "path";
import { getStateDir } from "../../src/util/session.ts";

// Use /tmp directly to match task-tracker.ts (not os.tmpdir() which differs on macOS)
const TMP_BASE = "/tmp";

describe("task-tracker", () => {
  const testSessionId = "test-session-123";
  const testDir = join(TMP_BASE, `claude-sl-${testSessionId}`);

  beforeEach(() => {
    // Clean up before each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("getSessionDir", () => {
    it("returns correct path for session directory", () => {
      // Now uses the new session.ts format with hashed keys
      const result = getSessionDir("my-session");
      expect(result).toContain("claude-tasks-");
    });
  });

  describe("getActiveTaskCount", () => {
    it("returns 0 when no directory exists", () => {
      const result = getActiveTaskCount("non-existent-session");
      expect(result).toBe(0);
    });
  });

  describe("getActiveTasksByModel", () => {
    it("returns empty map when no directory exists", () => {
      const result = getActiveTasksByModel("non-existent-session");
      expect(result.size).toBe(0);
    });
  });

  describe("isAlive", () => {
    it("returns true for current process", () => {
      expect(isAlive(process.pid)).toBe(true);
    });

    it("returns false for non-existent PID", () => {
      // PID 999999 is unlikely to exist
      expect(isAlive(999999)).toBe(false);
    });
  });

  describe("cleanStaleDirectories", () => {
    const staleSessionId = "stale-session";
    const staleDir = join(TMP_BASE, `claude-sl-${staleSessionId}`);
    const freshSessionId = "fresh-session";
    const freshDir = join(TMP_BASE, `claude-sl-${freshSessionId}`);
    const nonClaudeDir = join(TMP_BASE, "other-directory");

    beforeEach(() => {
      // Clean up any existing test directories
      [staleDir, freshDir, nonClaudeDir].forEach((dir) => {
        if (existsSync(dir)) {
          rmSync(dir, { recursive: true, force: true });
        }
      });
    });

    afterEach(() => {
      // Clean up test directories
      [staleDir, freshDir, nonClaudeDir].forEach((dir) => {
        if (existsSync(dir)) {
          rmSync(dir, { recursive: true, force: true });
        }
      });
    });

    it("doesn't throw when called", () => {
      expect(() => cleanStaleDirectories()).not.toThrow();
    });

    it("doesn't remove non-claude-sl directories", () => {
      mkdirSync(nonClaudeDir, { recursive: true });
      writeFileSync(join(nonClaudeDir, "test.txt"), "test");

      cleanStaleDirectories();

      expect(existsSync(nonClaudeDir)).toBe(true);
    });

    it("removes directories older than 24 hours", () => {
      mkdirSync(staleDir, { recursive: true });
      writeFileSync(join(staleDir, "agent_abc123"), "");

      // Set directory mtime to 25 hours ago
      const staleTime = Date.now() - 25 * 60 * 60 * 1000;
      const { utimesSync } = require("fs");
      utimesSync(staleDir, new Date(staleTime), new Date(staleTime));

      cleanStaleDirectories();

      expect(existsSync(staleDir)).toBe(false);
    });

    it("keeps fresh directories", () => {
      mkdirSync(freshDir, { recursive: true });
      writeFileSync(join(freshDir, "agent_abc123"), "");

      cleanStaleDirectories();

      expect(existsSync(freshDir)).toBe(true);
    });
  });
});

describe("getActiveTasksByModel (new format)", () => {
  const sessionKey = "test-new-format";
  const sessionDir = join(getStateDir(), sessionKey);

  beforeEach(() => {
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
    mkdirSync(join(sessionDir, "active"), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  });

  it("reads model counts from active directory", () => {
    // Write test entries with current process PID (alive)
    writeFileSync(
      join(sessionDir, "active", "agent-1.json"),
      JSON.stringify({ model: "opus", parentPid: process.pid, ts: Date.now() })
    );
    writeFileSync(
      join(sessionDir, "active", "agent-2.json"),
      JSON.stringify({ model: "sonnet", parentPid: process.pid, ts: Date.now() })
    );
    writeFileSync(
      join(sessionDir, "active", "agent-3.json"),
      JSON.stringify({ model: "opus", parentPid: process.pid, ts: Date.now() })
    );

    const result = getActiveTasksByModel(sessionKey);
    expect(result.get("opus")).toBe(2);
    expect(result.get("sonnet")).toBe(1);
  });

  it("removes stale entries older than 30 minutes", () => {
    // Write a stale entry - need to set file mtime, not JSON ts field
    const { utimesSync } = require("fs");
    const staleTime = Date.now() - 31 * 60 * 1000; // 31 minutes ago

    const staleFile = join(sessionDir, "active", "agent-stale.json");
    writeFileSync(
      staleFile,
      JSON.stringify({ model: "haiku", parentPid: process.pid, ts: staleTime })
    );
    // Set file mtime to stale time so it gets cleaned up
    utimesSync(staleFile, new Date(staleTime), new Date(staleTime));

    const result = getActiveTasksByModel(sessionKey);
    expect(result.size).toBe(0);
    // Stale file should be removed
    expect(existsSync(join(sessionDir, "active", "agent-stale.json"))).toBe(false);
  });

  it("removes entries with dead parent PID", () => {
    // Write entry with non-existent PID
    writeFileSync(
      join(sessionDir, "active", "agent-dead.json"),
      JSON.stringify({ model: "sonnet", parentPid: 999999, ts: Date.now() })
    );

    const result = getActiveTasksByModel(sessionKey);
    expect(result.size).toBe(0);
    // Dead PID file should be removed
    expect(existsSync(join(sessionDir, "active", "agent-dead.json"))).toBe(false);
  });
});
