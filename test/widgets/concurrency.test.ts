/**
 * Concurrency Widget tests
 */

import { describe, it, expect } from "bun:test";
import { createConcurrencyWidget } from "../../src/widgets/concurrency.ts";
import type { ClaudeCodeInput, Config } from "../../src/types.ts";

describe("ConcurrencyWidget", () => {
  it("should show compact format with icon", async () => {
    const input: ClaudeCodeInput = {
      model: "glm-4.7",
    };

    const widget = createConcurrencyWidget();
    const result = await widget.render(input, { format: "compact" });

    expect(result).toContain("\uf046"); // nf-cod-sync icon
    expect(result).toContain("conc:");
    expect(result).toContain("5"); // default concurrency
  });

  it("should show minimal format (number only)", async () => {
    const input: ClaudeCodeInput = {
      model: "glm-4.7",
    };

    const widget = createConcurrencyWidget();
    const result = await widget.render(input, { format: "minimal" });

    expect(result).toBe("5"); // default concurrency, number only
  });

  it("should show detailed format with label", async () => {
    const input: ClaudeCodeInput = {
      model: "glm-4.7",
    };

    const widget = createConcurrencyWidget();
    const result = await widget.render(input, { format: "detailed" });

    expect(result).toContain("concurrency:");
    expect(result).toContain("5"); // default concurrency
  });

  it("should return empty string when no model", async () => {
    const input: ClaudeCodeInput = {};

    const widget = createConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("");
  });

  it("should use custom icon when provided", async () => {
    const input: ClaudeCodeInput = {
      model: "glm-4.7",
    };

    const widget = createConcurrencyWidget();
    const result = await widget.render(input, { icon: "\uf015" }); // nf-fa-home

    expect(result).toContain("\uf015");
  });

  it("should handle model as string", async () => {
    const input: ClaudeCodeInput = {
      model: "glm-5",
    };

    const widget = createConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("should handle model as object with id", async () => {
    const input: ClaudeCodeInput = {
      model: { id: "glm-4.7", display_name: "GLM-4.7" },
    };

    const widget = createConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return empty string when model object has no id", async () => {
    const input: ClaudeCodeInput = {
      model: { display_name: "Some Model" },
    };

    const widget = createConcurrencyWidget();
    const result = await widget.render(input, {});

    expect(result).toBe("");
  });

  describe("Global config concurrency limits", () => {
    it("should use configured concurrency limit from global config", async () => {
      const input: ClaudeCodeInput = {
        model: "glm-5",
      };

      const globalConfig: Config = {
        concurrencyLimits: {
          "glm-5": 3,
        },
      };

      const widget = createConcurrencyWidget();
      const result = await widget.render(input, {}, globalConfig);

      expect(result).toContain("3");
    });

    it("should use default concurrency when model not in config", async () => {
      const input: ClaudeCodeInput = {
        model: "unknown-model",
      };

      const globalConfig: Config = {
        concurrencyLimits: {
          "glm-5": 3,
        },
      };

      const widget = createConcurrencyWidget();
      const result = await widget.render(input, {}, globalConfig);

      expect(result).toContain("5"); // default
    });

    it("should use default concurrency when no global config provided", async () => {
      const input: ClaudeCodeInput = {
        model: "glm-5",
      };

      const widget = createConcurrencyWidget();
      const result = await widget.render(input, {});

      expect(result).toContain("5"); // default
    });

    it("should handle multiple models with different limits", async () => {
      const globalConfig: Config = {
        concurrencyLimits: {
          "glm-5": 3,
          "glm-4.7": 5,
          "glm-4.6": 3,
          "glm-4.5": 10,
        },
      };

      const widget = createConcurrencyWidget();

      const glm5Result = await widget.render({ model: "glm-5" }, {}, globalConfig);
      expect(glm5Result).toContain("3");

      const glm47Result = await widget.render({ model: "glm-4.7" }, {}, globalConfig);
      expect(glm47Result).toContain("5");

      const glm46Result = await widget.render({ model: "glm-4.6" }, {}, globalConfig);
      expect(glm46Result).toContain("3");

      const glm45Result = await widget.render({ model: "glm-4.5" }, {}, globalConfig);
      expect(glm45Result).toContain("10");
    });
  });
});
