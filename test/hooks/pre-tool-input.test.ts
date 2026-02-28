import { describe, it, expect } from "bun:test";
import type { PreToolUseInput } from "../../src/util/model.ts";

describe("PreToolUseInput type", () => {
  it("includes subagent_type field", () => {
    const input: PreToolUseInput = {
      tool_name: "Task",
      tool_input: {
        subagent_type: "code-simplifier:code-simplifier",
        description: "test",
        prompt: "test prompt"
      }
    };
    expect(input.tool_input.subagent_type).toBe("code-simplifier:code-simplifier");
  });
});
