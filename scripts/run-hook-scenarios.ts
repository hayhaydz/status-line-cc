#!/usr/bin/env bun
import { existsSync } from "fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { basename, extname, join, resolve } from "path";
import { spawnSync } from "child_process";

type HookAction = "pre-tool" | "agent-start" | "agent-stop";

type Expectation = {
  contains?: string[];
  notContains?: string[];
  regex?: string[];
};

type ScenarioStep =
  | {
      type: "hook";
      action: HookAction;
      input: Record<string, unknown>;
      label?: string;
      env?: Record<string, string>;
      cwd?: string;
    }
  | {
      type: "render";
      input: Record<string, unknown>;
      label?: string;
      env?: Record<string, string>;
      cwd?: string;
      expect?: Expectation;
    }
  | {
      type: "write-project-config";
      config: Record<string, unknown>;
      cwd?: string;
      legacy?: boolean;
      label?: string;
    }
  | {
      type: "write-global-config";
      config: Record<string, unknown>;
      label?: string;
    };

type Scenario = {
  name?: string;
  description?: string;
  defaults?: {
    env?: Record<string, string>;
    cwd?: string;
  };
  steps: ScenarioStep[];
};

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

type CliOptions = {
  scenarioPath: string;
  target: string;
  keepTemp: boolean;
};

const PROJECT_ROOT = resolve(import.meta.dir, "..");
const DEFAULT_SCENARIO_DIR = join(PROJECT_ROOT, "fixtures", "scenarios");
const DEFAULT_BINARY = join(PROJECT_ROOT, "build", "statusline-hyz-cc");
const DEFAULT_TARGET = existsSync(DEFAULT_BINARY)
  ? DEFAULT_BINARY
  : join(PROJECT_ROOT, "src", "main.ts");

function parseArgs(argv: string[]): CliOptions {
  let scenarioPath = DEFAULT_SCENARIO_DIR;
  let target = DEFAULT_TARGET;
  let keepTemp = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if ((arg === "--scenario" || arg === "-s") && argv[i + 1]) {
      scenarioPath = resolve(PROJECT_ROOT, argv[i + 1]);
      i++;
      continue;
    }

    if ((arg === "--target" || arg === "-t") && argv[i + 1]) {
      target = resolve(PROJECT_ROOT, argv[i + 1]);
      i++;
      continue;
    }

    if (arg === "--keep-temp") {
      keepTemp = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return { scenarioPath, target, keepTemp };
}

function printHelp(): void {
  console.log(`
Hook scenario runner for statusline-hyz-cc

Usage:
  bun run scripts/run-hook-scenarios.ts [options]

Options:
  -s, --scenario <path>   Scenario file or directory (default: fixtures/scenarios)
  -t, --target <path>     statusline executable or src/main.ts
      --keep-temp         Keep temporary test directories for inspection
  -h, --help              Show this message
`.trim());
}

function listScenarioFiles(scenarioPath: string): Promise<string[]> {
  if (!existsSync(scenarioPath)) {
    throw new Error(`Scenario path not found: ${scenarioPath}`);
  }

  if (extname(scenarioPath) === ".json") {
    return Promise.resolve([scenarioPath]);
  }

  return readdir(scenarioPath).then((entries) =>
    entries
      .filter((entry) => entry.endsWith(".json"))
      .sort()
      .map((entry) => join(scenarioPath, entry))
  );
}

function resolveStepCwd(baseWorkspace: string, stepCwd?: string, defaultCwd?: string): string {
  const cwd = stepCwd ?? defaultCwd ?? ".";
  return resolve(baseWorkspace, cwd);
}

function getCommand(target: string, args: string[]): { cmd: string; cmdArgs: string[] } {
  if (target.endsWith(".ts") || target.endsWith(".js")) {
    return { cmd: process.execPath, cmdArgs: ["run", target, ...args] };
  }

  return { cmd: target, cmdArgs: args };
}

function runStatusline(
  target: string,
  args: string[],
  input: Record<string, unknown>,
  env: Record<string, string>,
  cwd: string
): RunResult {
  const { cmd, cmdArgs } = getCommand(target, args);
  const proc = spawnSync(cmd, cmdArgs, {
    cwd,
    env,
    input: JSON.stringify(input),
    encoding: "utf-8",
  });

  if (proc.error) {
    throw proc.error;
  }

  return {
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
    exitCode: proc.status ?? 1,
  };
}

function runExpectation(expectation: Expectation | undefined, stdout: string): string[] {
  if (!expectation) return [];

  const failures: string[] = [];

  for (const text of expectation.contains ?? []) {
    if (!stdout.includes(text)) {
      failures.push(`missing expected text: ${JSON.stringify(text)}`);
    }
  }

  for (const text of expectation.notContains ?? []) {
    if (stdout.includes(text)) {
      failures.push(`unexpected text present: ${JSON.stringify(text)}`);
    }
  }

  for (const rawPattern of expectation.regex ?? []) {
    const pattern = new RegExp(rawPattern);
    if (!pattern.test(stdout)) {
      failures.push(`regex did not match: /${rawPattern}/`);
    }
  }

  return failures;
}

async function writeProjectConfig(
  workspaceDir: string,
  cwd: string,
  config: Record<string, unknown>,
  legacy = false
): Promise<string> {
  const targetDir = resolve(workspaceDir, cwd);
  await mkdir(targetDir, { recursive: true });

  if (legacy) {
    const path = join(targetDir, ".statusline-hyz-cc.json");
    await writeFile(path, JSON.stringify(config, null, 2));
    return path;
  }

  const dirConfig = join(targetDir, ".statusline-hyz-cc");
  await mkdir(dirConfig, { recursive: true });
  const path = join(dirConfig, "config.json");
  await writeFile(path, JSON.stringify(config, null, 2));
  return path;
}

async function writeGlobalConfig(homeDir: string, config: Record<string, unknown>): Promise<string> {
  const configDir = join(homeDir, ".claude", "statusline-hyz-cc");
  await mkdir(configDir, { recursive: true });
  const path = join(configDir, "config.json");
  await writeFile(path, JSON.stringify(config, null, 2));
  return path;
}

function printStepOutput(index: number, label: string, output: string): void {
  console.log(`  ${index}. ${label}`);
  const trimmed = output.trimEnd();
  if (trimmed.length === 0) {
    console.log("     <empty>");
    return;
  }

  for (const line of trimmed.split("\n")) {
    console.log(`     ${line}`);
  }
}

function printRenderPreview(index: number, label: string, stdout: string): void {
  const raw = stdout.trimEnd();

  console.log(`  ${index}. ${label}`);
  console.log("     full:");
  if (raw.length === 0) {
    console.log("       <empty>");
    console.log("     breakdown:");
    console.log("       <none>");
    return;
  }

  for (const line of raw.split("\n")) {
    console.log(`       ${line}`);
  }

  const segments = raw.split(" | ").filter((segment) => segment.length > 0);
  console.log("     breakdown:");
  if (segments.length === 0) {
    console.log("       <none>");
    return;
  }

  for (let i = 0; i < segments.length; i++) {
    console.log(`       [${i + 1}] ${segments[i]}`);
  }
}

async function runScenarioFile(filePath: string, target: string, keepTemp: boolean): Promise<boolean> {
  const raw = await readFile(filePath, "utf-8");
  const scenario = JSON.parse(raw) as Scenario;

  if (!Array.isArray(scenario.steps) || scenario.steps.length === 0) {
    throw new Error(`Scenario has no steps: ${filePath}`);
  }

  const tempRoot = await mkdtemp(join(tmpdir(), "statusline-scenario-"));
  const homeDir = join(tempRoot, "home");
  const workspaceDir = join(tempRoot, "workspace");
  const tmpStateDir = join(tempRoot, "tmp");
  await mkdir(homeDir, { recursive: true });
  await mkdir(workspaceDir, { recursive: true });
  await mkdir(tmpStateDir, { recursive: true });

  const scenarioName = scenario.name ?? basename(filePath, ".json");
  const baseEnv: Record<string, string> = {
    ...process.env,
    HOME: homeDir,
    TMPDIR: tmpStateDir,
    ...scenario.defaults?.env,
  } as Record<string, string>;

  let ok = true;

  console.log(`\nScenario: ${scenarioName}`);
  if (scenario.description) {
    console.log(`  ${scenario.description}`);
  }

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    const stepNum = i + 1;

    if (step.type === "write-project-config") {
      const cwd = resolveStepCwd(workspaceDir, step.cwd, scenario.defaults?.cwd);
      const targetPath = await writeProjectConfig(workspaceDir, cwd, step.config, step.legacy);
      printStepOutput(stepNum, step.label ?? "write project config", targetPath);
      continue;
    }

    if (step.type === "write-global-config") {
      const targetPath = await writeGlobalConfig(homeDir, step.config);
      printStepOutput(stepNum, step.label ?? "write global config", targetPath);
      continue;
    }

    const cwd = resolveStepCwd(workspaceDir, step.cwd, scenario.defaults?.cwd);
    await mkdir(cwd, { recursive: true });

    const env = {
      ...baseEnv,
      ...(step.env ?? {}),
    };

    if (step.type === "hook") {
      const result = runStatusline(target, ["--hook", step.action], step.input, env, cwd);
      const label = step.label ?? `hook ${step.action}`;
      if (result.exitCode !== 0) {
        ok = false;
        printStepOutput(stepNum, `${label} (exit ${result.exitCode})`, result.stderr || result.stdout);
      } else {
        printStepOutput(stepNum, label, "ok");
      }
      continue;
    }

    const result = runStatusline(target, [], step.input, env, cwd);
    const label = step.label ?? "render";

    printRenderPreview(stepNum, `${label}${result.exitCode === 0 ? "" : ` (exit ${result.exitCode})`}`, result.stdout);
    if (result.stderr.trim()) {
      printStepOutput(stepNum, `${label} stderr`, result.stderr);
    }

    if (result.exitCode !== 0) {
      ok = false;
      continue;
    }

    const failures = runExpectation(step.expect, result.stdout);
    if (failures.length > 0) {
      ok = false;
      for (const failure of failures) {
        printStepOutput(stepNum, `${label} assertion failed`, failure);
      }
    }
  }

  if (keepTemp) {
    console.log(`  temp dir: ${tempRoot}`);
  } else {
    await rm(tempRoot, { recursive: true, force: true });
  }

  return ok;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!existsSync(options.target)) {
    throw new Error(`Target not found: ${options.target}`);
  }

  const files = await listScenarioFiles(options.scenarioPath);
  if (files.length === 0) {
    throw new Error(`No scenario JSON files found: ${options.scenarioPath}`);
  }

  console.log(`Using target: ${options.target}`);
  console.log(`Running ${files.length} scenario(s)...`);

  let pass = 0;
  let fail = 0;

  for (const filePath of files) {
    try {
      const ok = await runScenarioFile(filePath, options.target, options.keepTemp);
      if (ok) {
        pass++;
      } else {
        fail++;
      }
    } catch (error) {
      fail++;
      console.log(`\nScenario file failed: ${filePath}`);
      console.log(`  ${(error as Error).message}`);
    }
  }

  console.log(`\nSummary: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
