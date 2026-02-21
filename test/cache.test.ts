/**
 * Cache utility tests
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { get, set, getOrCompute, clear, clearAll, cleanup } from "../src/util/cache.ts";

describe("Cache Utility", () => {
  beforeEach(() => {
    clearAll();
  });

  describe("set and get", () => {
    it("should store and retrieve values", () => {
      set("test-key", "test-value", 1000);
      expect(get("test-key")).toBe("test-value");
    });

    it("should return undefined for non-existent keys", () => {
      expect(get("non-existent")).toBeUndefined();
    });

    it("should expire entries after TTL", async () => {
      set("test-key", "test-value", 50); // 50ms TTL
      expect(get("test-key")).toBe("test-value");

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(get("test-key")).toBeUndefined();
    });
  });

  describe("stale entries", () => {
    it("should not return stale values when not allowed", async () => {
      set("test-key-no-stale", "test-value", 50); // 50ms TTL
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(get("test-key-no-stale", false)).toBeUndefined();
    });

    it("should return stale values when allowed", async () => {
      set("test-key-stale", "test-value", 50); // 50ms TTL
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(get("test-key-stale", true)).toBe("test-value");
    });
  });

  describe("getOrCompute", () => {
    it("should return cached value if fresh", async () => {
      set("test-key", "cached", 1000);

      const value = await getOrCompute("test-key", async () => "computed", 1000);

      expect(value).toBe("cached");
    });

    it("should compute and cache if missing", async () => {
      let computeCount = 0;

      const value1 = await getOrCompute("test-key", async () => {
        computeCount++;
        return "computed";
      }, 1000);

      expect(value1).toBe("computed");
      expect(computeCount).toBe(1);

      // Second call should use cache
      const value2 = await getOrCompute("test-key", async () => {
        computeCount++;
        return "computed-again";
      }, 1000);

      expect(value2).toBe("computed");
      expect(computeCount).toBe(1);
    });
  });

  describe("clear", () => {
    it("should clear specific key", () => {
      set("key1", "value1", 1000);
      set("key2", "value2", 1000);

      clear("key1");

      expect(get("key1")).toBeUndefined();
      expect(get("key2")).toBe("value2");
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", async () => {
      set("permanent", "value", 10000);
      set("expired", "value", 50);

      await new Promise((resolve) => setTimeout(resolve, 60));

      const removed = cleanup();

      expect(removed).toBe(1);
      expect(get("permanent")).toBe("value");
      expect(get("expired")).toBeUndefined();
    });
  });
});
