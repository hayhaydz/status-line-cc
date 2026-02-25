import { describe, it, expect } from "bun:test";
import { formatOutput } from "../../src/util/format.ts";

describe("formatOutput", () => {
  it("joins non-null values with separator", () => {
    const result = formatOutput(["main *8", "GLM-5 3x", "39.6k/200k"]);
    expect(result).toBe("main *8 | GLM-5 3x | 39.6k/200k");
  });

  it("filters out null values", () => {
    const result = formatOutput(["main *8", null, "39.6k/200k"]);
    expect(result).toBe("main *8 | 39.6k/200k");
  });

  it("filters out empty strings", () => {
    const result = formatOutput(["main *8", "", "39.6k/200k"]);
    expect(result).toBe("main *8 | 39.6k/200k");
  });

  it("returns empty string when all values are null/empty", () => {
    const result = formatOutput([null, "", null]);
    expect(result).toBe("");
  });

  it("handles single value", () => {
    const result = formatOutput(["main *8"]);
    expect(result).toBe("main *8");
  });

  it("handles all null", () => {
    const result = formatOutput([null, null, null]);
    expect(result).toBe("");
  });
});
