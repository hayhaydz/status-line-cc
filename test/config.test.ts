/**
 * Config loader tests
 */

import { describe, it, expect } from "bun:test";
import { deepMerge } from "../src/config.ts";

describe("Config Utility", () => {
  describe("deepMerge", () => {
    it("should merge shallow objects", () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("should merge nested objects", () => {
      const target = { a: { x: 1, y: 2 }, b: 3 };
      const source = { a: { y: 10, z: 5 }, c: 4 };

      const result = deepMerge(target, source);

      expect(result).toEqual({
        a: { x: 1, y: 10, z: 5 },
        b: 3,
        c: 4,
      });
    });

    it("should not mutate original objects", () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3 };

      const result = deepMerge(target, source);

      expect(target).toEqual({ a: 1, b: 2 });
      expect(source).toEqual({ b: 3 });
      expect(result).toEqual({ a: 1, b: 3 });
    });

    it("should handle arrays as values (not merge)", () => {
      const target = { arr: [1, 2, 3] };
      const source = { arr: [4, 5] };

      const result = deepMerge(target, source);

      expect(result).toEqual({ arr: [4, 5] });
    });
  });
});
