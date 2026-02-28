// test/util/suppress.test.ts
import { describe, it, expect } from "bun:test";
import { suppress, suppressAsync } from "../../src/util/suppress.ts";

describe("suppress", () => {
  it("executes function without error", () => {
    let called = false;
    suppress(() => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it("swallows thrown errors", () => {
    expect(() => {
      suppress(() => {
        throw new Error("test");
      });
    }).not.toThrow();
  });

  it("returns void", () => {
    const result = suppress(() => {});
    expect(result).toBeUndefined();
  });
});

describe("suppressAsync", () => {
  it("executes async function without error", async () => {
    let called = false;
    await suppressAsync(async () => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it("swallows async errors", async () => {
    await expect(
      suppressAsync(async () => {
        throw new Error("test");
      })
    ).resolves.toBeUndefined();
  });

  it("returns void promise", async () => {
    const result = await suppressAsync(async () => {});
    expect(result).toBeUndefined();
  });
});
