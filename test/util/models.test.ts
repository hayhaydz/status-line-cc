// test/util/models.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { extractModel } from "../../src/util/model.ts";

const ENV_KEYS = [
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
] as const;

const originalEnv: Record<string, string | undefined> = {};

describe("extractModel", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("maps claude-3-opus model ID to glm-5 by default", () => {
    const result = extractModel({ tool_name: "Task", tool_input: { model: "claude-3-opus-20240229" } });
    expect(result).toBe("glm-5");
  });

  it("maps claude-sonnet-4 model ID to glm-4.7 by default", () => {
    const result = extractModel({ tool_name: "Task", tool_input: { model: "claude-sonnet-4-20250514" } });
    expect(result).toBe("glm-4.7");
  });

  it("maps claude-3-haiku model ID to glm-4.5-air by default", () => {
    const result = extractModel({ tool_name: "Task", tool_input: { model: "claude-3-haiku-20240307" } });
    expect(result).toBe("glm-4.5-air");
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

  it("uses environment override mappings when provided", () => {
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = "glm-5";
    const result = extractModel({ tool_name: "Task", tool_input: { model: "claude-sonnet-4-20250514" } });
    expect(result).toBe("glm-5");
  });
});
