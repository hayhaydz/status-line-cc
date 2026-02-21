import { describe, it, expect } from "bun:test";
import { extractModelId } from "../../src/util/model.ts";

describe("extractModelId", () => {
  it("returns undefined when model is not provided", () => {
    const result = extractModelId({});
    expect(result).toBeUndefined();
  });

  it("returns model string when model is a string", () => {
    const result = extractModelId({ model: "glm-4.7" });
    expect(result).toBe("glm-4.7");
  });

  it("returns model.id when model is an object", () => {
    const result = extractModelId({ model: { id: "glm-5", display_name: "GLM-5" } });
    expect(result).toBe("glm-5");
  });

  it("returns undefined when model.id is not present", () => {
    const result = extractModelId({ model: { display_name: "GLM-5" } });
    expect(result).toBeUndefined();
  });
});
