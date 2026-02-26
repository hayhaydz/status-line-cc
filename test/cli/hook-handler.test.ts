// test/cli/hook-handler.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getStateDir } from "../../src/util/session.ts";

const TEST_SESSION = "test-hook-handler";

describe("hook-handler CLI", () => {
  const sessionDir = join(getStateDir(), TEST_SESSION);

  beforeEach(() => {
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  });

  // Note: Full integration tests would spawn the binary
  // Here we test the handler function directly
});
