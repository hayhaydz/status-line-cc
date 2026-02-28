// test/util/session.test.ts
import { describe, it, expect } from "bun:test";
import { getSessionKey, getStateDir, getSessionPaths } from "../../src/util/session.ts";

describe("session", () => {
  describe("getStateDir", () => {
    it("returns path with TMPDIR and uid", () => {
      const result = getStateDir();
      expect(result).toContain("claude-tasks-");
      expect(result).toMatch(/\/(tmp|var\/folders)/);
    });
  });

  describe("getSessionKey", () => {
    it("uses session_id when available", () => {
      const result = getSessionKey({ session_id: "abc123" });
      expect(result).toBe("6ca13d52ca70"); // sha256 of "abc123" truncated to 12 chars
    });

    it("falls back to env.CLAUDE_SESSION_ID", () => {
      const result = getSessionKey({ env: { CLAUDE_SESSION_ID: "xyz789" } });
      expect(result).toBe("5a4640c17e8e"); // sha256 of "xyz789"
    });

    it("falls back to parent_pid", () => {
      const result = getSessionKey({ parent_pid: 12345 });
      expect(result).toHaveLength(12);
    });

    it("falls back to cwd as last resort", () => {
      const result = getSessionKey({ cwd: "/home/user/project" });
      expect(result).toHaveLength(12);
    });

    it("throws when no discriminator available", () => {
      expect(() => getSessionKey({})).toThrow("No session discriminator available");
    });
  });

  describe("getSessionPaths", () => {
    it("returns queue and active paths", () => {
      const paths = getSessionPaths("/tmp/session-abc");
      expect(paths.queue).toBe("/tmp/session-abc/queue");
      expect(paths.active).toBe("/tmp/session-abc/active");
    });

    it("returns activeFile function that constructs agent file paths", () => {
      const paths = getSessionPaths("/tmp/session-abc");
      expect(paths.activeFile("agent123")).toBe("/tmp/session-abc/active/agent123.json");
    });

    it("handles different base paths", () => {
      const paths = getSessionPaths("/var/folders/xyz123");
      expect(paths.queue).toBe("/var/folders/xyz123/queue");
      expect(paths.active).toBe("/var/folders/xyz123/active");
      expect(paths.activeFile("test")).toBe("/var/folders/xyz123/active/test.json");
    });
  });
});
