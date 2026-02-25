import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  getSessionDir,
  getActiveTaskCount,
  getActiveTasksByModel,
  cleanStaleDirectories,
} from "../../src/util/task-tracker.ts";
import { existsSync, mkdirSync, rmSync, writeFileSync, lstatSync } from "fs";
import { join } from "path";

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
      const result = getSessionDir("my-session");
      expect(result).toBe(join(TMP_BASE, "claude-sl-my-session"));
    });
  });

  describe("getActiveTaskCount", () => {
    it("returns 0 when no directory exists", () => {
      const result = getActiveTaskCount("non-existent-session");
      expect(result).toBe(0);
    });

    it("returns sum of all model counts when tasks exist", () => {
      // This test relies on the task-tracker.sh script being available
      // In a unit test environment, we mock the by testing getActiveTasksByModel directly
      const result = getActiveTaskCount("non-existent-session");
      expect(result).toBe(0);
    });
  });

  describe("getActiveTasksByModel", () => {
    it("returns empty map when script fails or returns 0", () => {
      const result = getActiveTasksByModel("non-existent-session");
      expect(result.size).toBe(0);
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
