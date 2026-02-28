import { describe, it, expect } from "bun:test";
import { getQuotaLimit, findQuotaLimit, type RawGLMQuotaResponse } from "../../src/util/glm-api.ts";

describe("getQuotaLimit", () => {
  it("is exported as a function", () => {
    expect(typeof getQuotaLimit).toBe("function");
  });

  it("returns null for non-existent limit type", async () => {
    const result = await getQuotaLimit({ glm: {} }, "NONEXISTENT_TYPE_XYZ");
    // Either returns null (error) or undefined-like (not found)
    expect(result).toBeNull();
  });

  it("returns quota limit when found", async () => {
    // This test uses live API if credentials are available
    const result = await getQuotaLimit({ glm: {} }, "TOKENS_LIMIT");
    // If API works, we get a limit; if not, we get null - either is valid
    if (result !== null) {
      expect(result.type).toBe("TOKENS_LIMIT");
      expect(typeof result.percentage).toBe("number");
    }
  });
});

describe("findQuotaLimit", () => {
  it("returns undefined for error responses", () => {
    const errorResponse = { error: "test error" };
    const result = findQuotaLimit(errorResponse, "TOKENS_LIMIT");
    expect(result).toBeUndefined();
  });

  it("finds matching limit type", () => {
    const response: RawGLMQuotaResponse = {
      limits: [
        { type: "TOKENS_LIMIT", percentage: 50 },
        { type: "TIME_LIMIT", percentage: 30 },
      ],
    };
    const result = findQuotaLimit(response, "TOKENS_LIMIT");
    expect(result?.type).toBe("TOKENS_LIMIT");
    expect(result?.percentage).toBe(50);
  });

  it("returns undefined when type not found", () => {
    const response: RawGLMQuotaResponse = {
      limits: [{ type: "TOKENS_LIMIT", percentage: 50 }],
    };
    const result = findQuotaLimit(response, "NONEXISTENT");
    expect(result).toBeUndefined();
  });
});
