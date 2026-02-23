import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  getSessionDir,
  getActiveTaskCount,
  getActiveTasksByModel,
  cleanStaleDirectories,
} from "../../src/util/task-tracker.ts";
import { existsSync, mkdirSync, rmSync, writeFileSync, lstatSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("task-tracker", () => {
  const testSessionId = "test-session-123";
  const testDir = join(tmpdir(), `claude-sl-${testSessionId}`);

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
      expect(result).toBe(join(tmpdir(), "claude-sl-my-session"));
    });
  });

  describe("getActiveTaskCount", () => {
    it("returns 0 when no directory exists", () => {
      const result = getActiveTaskCount("non-existent-session", "glm-4.5");
      expect(result).toBe(0);
    });

    it("returns 0 when directory exists but no tasks for model", () => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, "glm-4.7-call_abc123"), "");

      const result = getActiveTaskCount(testSessionId, "glm-4.5");
      expect(result).toBe(0);
    });

    it("counts files with model prefix correctly", () => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, "glm-4.5-call_abc123"), "");
      writeFileSync(join(testDir, "glm-4.5-call_def456"), "");
      writeFileSync(join(testDir, "glm-4.7-call_ghi789"), "");

      const result = getActiveTaskCount(testSessionId, "glm-4.5");
      expect(result).toBe(2);
    });

    it("ignores files without -call_ delimiter", () => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, "glm-4.5-call_abc123"), "");
      writeFileSync(join(testDir, "glm-4.5-something"), "");

      const result = getActiveTaskCount(testSessionId, "glm-4.5");
      expect(result).toBe(1);
    });
  });

  describe("getActiveTasksByModel", () => {
    it("returns empty map when no directory exists", () => {
      const result = getActiveTasksByModel("non-existent-session");
      expect(result.size).toBe(0);
    });

    it("returns empty map when directory is empty", () => {
      mkdirSync(testDir, { recursive: true });

      const result = getActiveTasksByModel(testSessionId);
      expect(result.size).toBe(0);
    });

    it("groups tasks by model correctly", () => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, "glm-4.5-call_abc123"), "");
      writeFileSync(join(testDir, "glm-4.5-call_def456"), "");
      writeFileSync(join(testDir, "glm-4.7-call_ghi789"), "");
      writeFileSync(join(testDir, "glm-5-call_jkl012"), "");

      const result = getActiveTasksByModel(testSessionId);

      expect(result.size).toBe(3);
      expect(result.get("glm-4.5")).toBe(2);
      expect(result.get("glm-4.7")).toBe(1);
      expect(result.get("glm-5")).toBe(1);
    });

    it("ignores files without -call_ delimiter", () => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, "glm-4.5-call_abc123"), "");
      writeFileSync(join(testDir, "random-file"), "");
      writeFileSync(join(testDir, "another-file.txt"), "");

      const result = getActiveTasksByModel(testSessionId);

      expect(result.size).toBe(1);
      expect(result.get("glm-4.5")).toBe(1);
    });
  });

  describe("cleanStaleDirectories", () => {
    const staleSessionId = "stale-session";
    const staleDir = join(tmpdir(), `claude-sl-${staleSessionId}`);
    const freshSessionId = "fresh-session";
    const freshDir = join(tmpdir(), `claude-sl-${freshSessionId}`);
    const nonClaudeDir = join(tmpdir(), "other-directory");

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
      writeFileSync(join(staleDir, "glm-4.5-call_abc123"), "");

      // Set directory mtime to 25 hours ago
      const staleTime = Date.now() - 25 * 60 * 60 * 1000;
      const stats = lstatSync(staleDir);
      // Use utimes to modify the time
      const { utimesSync } = require("fs");
      utimesSync(staleDir, new Date(staleTime), new Date(staleTime));

      cleanStaleDirectories();

      expect(existsSync(staleDir)).toBe(false);
    });

    it("keeps fresh directories", () => {
      mkdirSync(freshDir, { recursive: true });
      writeFileSync(join(freshDir, "glm-4.5-call_abc123"), "");

      cleanStaleDirectories();

      expect(existsSync(freshDir)).toBe(true);
    });
  });
});
