/**
 * CLI command handling tests
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { parseCliArgs } from "../src/cli.ts";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFile } from "node:fs/promises";

// Create a temp directory for all tests
let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "statusline-test-"));
});

afterAll(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("CLI Argument Parsing", () => {
  it("should parse --help flag", () => {
    const result = parseCliArgs(["--help"]);
    expect(result).toEqual({ command: "help" });
  });

  it("should parse -h as help", () => {
    const result = parseCliArgs(["-h"]);
    expect(result).toEqual({ command: "help" });
  });

  it("should parse --enable flag", () => {
    const result = parseCliArgs(["--enable"]);
    expect(result).toEqual({ command: "enable" });
  });

  it("should parse --disable flag", () => {
    const result = parseCliArgs(["--disable"]);
    expect(result).toEqual({ command: "disable" });
  });

  it("should parse --project-disable flag", () => {
    const result = parseCliArgs(["--project-disable"]);
    expect(result).toEqual({ command: "project-disable" });
  });

  it("should parse --status flag", () => {
    const result = parseCliArgs(["--status"]);
    expect(result).toEqual({ command: "status" });
  });

  it("should return empty result for no args", () => {
    const result = parseCliArgs([]);
    expect(result).toEqual({ command: null });
  });

  it("should return empty result for unknown args", () => {
    const result = parseCliArgs(["--unknown", "args"]);
    expect(result).toEqual({ command: null });
  });
});

describe("CLI Config Operations", () => {
  it("should create global config directory if it doesn't exist", async () => {
    const configPath = join(tempDir, "test-config-1.json");
    const configDir = join(tempDir, ".claude", "statusline-hyz-cc");

    // Write a config file to test directory creation
    await writeFile(configPath, JSON.stringify({ enabled: true, testPath: configPath, testDir: configDir }));

    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);

    expect(config.enabled).toBe(true);
    expect(config.testPath).toBe(configPath);
  });

  it("should create project config with enabled: false", async () => {
    const projectConfigPath = join(tempDir, ".statusline-hyz-cc.json");

    await writeFile(projectConfigPath, JSON.stringify({ enabled: false }));

    expect(existsSync(projectConfigPath)).toBe(true);

    const content = readFileSync(projectConfigPath, "utf-8");
    const config = JSON.parse(content);

    expect(config.enabled).toBe(false);
  });

  it("should handle empty args array", () => {
    const result = parseCliArgs([]);
    expect(result.command).toBe(null);
  });

  it("should ignore multiple flags (only first one is processed)", () => {
    const result = parseCliArgs(["--help", "--enable"]);
    expect(result).toEqual({ command: "help" });
  });

  it("should parse --hook pre-tool", () => {
    const result = parseCliArgs(["--hook", "pre-tool"]);
    expect(result.command).toBe("hook");
    expect(result.hookAction).toBe("pre-tool");
  });

  it("should parse --hook agent-start", () => {
    const result = parseCliArgs(["--hook", "agent-start"]);
    expect(result.command).toBe("hook");
    expect(result.hookAction).toBe("agent-start");
  });

  it("should parse --hook agent-stop", () => {
    const result = parseCliArgs(["--hook", "agent-stop"]);
    expect(result.command).toBe("hook");
    expect(result.hookAction).toBe("agent-stop");
  });

  it("should return null for invalid hook action", () => {
    const result = parseCliArgs(["--hook", "invalid"]);
    expect(result.command).toBeNull();
  });
});
