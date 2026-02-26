// test/util/models.test.ts
import { describe, it, expect } from "bun:test";
import { extractModel } from "../../src/util/models.ts";

describe("extractModel", () => {
  it("extracts 'opus' from claude-3-opus model ID", () => {
    const result = extractModel({ tool_name: "Task", tool_input: { model: "claude-3-opus-20240229" } });
    expect(result).toBe("opus");
  });

  it("extracts 'sonnet' from claude-sonnet-4 model ID", () => {
    const result = extractModel({ tool_name: "Task", tool_input: { model: "claude-sonnet-4-20250514" } });
    expect(result).toBe("sonnet");
  });

  it("extracts 'haiku' from claude-3-haiku model ID", () => {
    const result = extractModel({ tool_name: "Task", tool_input: { model: "claude-3-haiku-20240307" } });
    expect(result).toBe("haiku");
  });

  it("returns 'unknown' when model is missing", () => {
    const result = extractModel({ tool_name: "Task", tool_input: {} });
    expect(result).toBe("unknown");
  });

  it("returns raw model ID when not recognized", () => {
    const result = extractModel({ tool_name: "Task", tool_input: { model: "custom-model-v1" } });
    expect(result).toBe("custom-model-v1");
  });

  it("handles glm model IDs", () => {
    const result = extractModel({ tool_name: "Task", tool_input: { model: "glm-4-plus" } });
    expect(result).toBe("glm-4-plus");
  });
});
