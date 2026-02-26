// test/util/atomic-fs.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { atomicWrite, queueFilename, popQueue } from "../../src/util/atomic-fs.ts";

const TEST_DIR = "/tmp/atomic-fs-test";

describe("atomic-fs", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("atomicWrite", () => {
    it("writes file atomically", () => {
      const filepath = join(TEST_DIR, "test.json");
      atomicWrite(filepath, '{"test": true}');

      expect(existsSync(filepath)).toBe(true);
      expect(readFileSync(filepath, "utf-8")).toBe('{"test": true}');
    });

    it("does not leave .tmp files behind", () => {
      const filepath = join(TEST_DIR, "test2.json");
      atomicWrite(filepath, '{"test": true}');

      const files = existsSync(TEST_DIR) ? readdirSync(TEST_DIR) : [];
      const tmpFiles = files.filter((f: string) => f.includes(".tmp"));
      expect(tmpFiles.length).toBe(0);
    });
  });

  describe("queueFilename", () => {
    it("generates unique filename with timestamp, pid, and uuid", () => {
      const filename = queueFilename();

      expect(filename).toMatch(/^\d+-\d+-[a-f0-9]{8}\.json$/);
      expect(filename.endsWith(".json")).toBe(true);
    });

    it("generates different filenames on successive calls", () => {
      const filename1 = queueFilename();
      const filename2 = queueFilename();

      expect(filename1).not.toBe(filename2);
    });
  });

  describe("popQueue", () => {
    it("returns null when queue is empty", () => {
      const queueDir = join(TEST_DIR, "queue");
      const activeDir = join(TEST_DIR, "active");
      mkdirSync(queueDir, { recursive: true });
      mkdirSync(activeDir, { recursive: true });

      const result = popQueue(queueDir, activeDir, "agent-1", () => {});
      expect(result).toBeNull();
    });

    it("pops oldest entry and creates active file", () => {
      const queueDir = join(TEST_DIR, "queue");
      const activeDir = join(TEST_DIR, "active");
      mkdirSync(queueDir, { recursive: true });
      mkdirSync(activeDir, { recursive: true });

      // Write queue entries
      atomicWrite(join(queueDir, "1000-100-abc.json"), '{"model":"opus"}');
      atomicWrite(join(queueDir, "2000-100-def.json"), '{"model":"sonnet"}');

      const result = popQueue(queueDir, activeDir, "agent-1", () => {});

      expect(result).toBe("opus");
      expect(existsSync(join(activeDir, "agent-1.json"))).toBe(true);
    });
  });
});
