import { describe, it, expect } from "bun:test";
import type { HookResponse } from "../../src/util/shared-types.ts";

describe("HookResponse type", () => {
  it("allows deny response with reason", () => {
    const response: HookResponse = { decision: "deny", reason: "test" };
    expect(response.decision).toBe("deny");
    expect(response.reason).toBe("test");
  });

  it("allows allow response without reason", () => {
    const response: HookResponse = { decision: "allow" };
    expect(response.decision).toBe("allow");
    expect(response.reason).toBeUndefined();
  });
});
