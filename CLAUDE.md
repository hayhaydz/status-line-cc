# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

**status-line-cc** is a lightweight, custom Claude Code CLI status line tool tailored for GLM Coding Plan users. It's designed to be simpler and more focused than existing tools like ccstatusline or CCometixLine.

**Key differentiator:** Built specifically for GLM API quota tracking and model concurrency monitoring, not Claude's model-specific features.

---

## Architecture Overview

### Planned Tech Stack

- **Language:** TypeScript
- **Runtime:** Bun (for single-binary compilation via `bun build --compile`)
- **Distribution:** npm package with platform-specific binaries

### Core Design Pattern

```
stdin (JSON from Claude Code)
  → parse
  → collect widget data
  → format output string
  → stdout (formatted status line)
```

**No TUI, no configuration UI, no React.** Just widgets that collect data and render strings.

### Widget System

Each widget is a self-contained module that:
1. Takes the parsed Claude Code JSON input
2. Collects its data (git commands, GLM API, transcript parsing, etc.)
3. Returns a formatted string

Widgets are registered in a central registry and rendered in order.

---

## Planned Widgets (Priority Order)

| Widget | Data Source | Priority |
|--------|-------------|----------|
| Git Branch + Status | `git` commands | High |
| Model Name + Multiplier | Input JSON `model.id` | High |
| GLM Concurrency | Config/API polling | High |
| Context Window % | Transcript parsing | High |
| 5-Hour Block % | GLM API + fixed schedule | High |
| GLM Quota | GLM API | High |
| Web Search Limit | GLM API | Medium |
| Cached Tokens | Transcript parsing | Medium |

**Not implementing:** GLM Plan Tier display, Cost Tracker, MCP auto-detection (manual config only)

---

## GLM API Integration

### Environment Variables Required

```bash
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_AUTH_TOKEN="your-token-here"
```

### Key Endpoints

| Endpoint | Purpose | Cache TTL |
|----------|---------|-----------|
| `/api/monitor/usage/quota/limit` | 5-hour block %, MCP/web quota | 5 min |
| `/api/monitor/usage/quota/modelUsage` | Model usage (last 24h) | 15 min |

**Important:** The 5-hour block API only returns percentage, not reset time. Use fixed UTC schedule (00:00, 05:00, 10:00...) for block time calculation.

### Model Concurrency Limits

```typescript
const CONCURRENCY_LIMITS: Record<string, number> = {
  "glm-5": 3,
  "glm-4.7": 5,
  "glm-4.6": 3,
  "glm-4.5": 10,
  "glm-4.5-air": 5,
};
```

---

## Nerd Font Icons

Icon decisions documented in `docs/ideas/nerd-fonts-icons.md`.

Default icon set:
- Git: `nf-oct-git` ()
- Model: `nf-fa-robot` ()
- Context: `nf-fa-bolt` ()
- Cache: `nf-oct-cache` ()
- Block: `nf-fa-clock` ()
- Concurrency: `nf-cod-sync` ()
- Web: `nf-fa-globe` ()
- Quota: `nf-cod-pie` ()

**Color scheme:** Based on CCometixLine Solarized theme (cyan, magenta, yellow, green)

---

## Documentation Structure

```
docs/
├── brainstorm/
│   └── brainstorm-custom-status-line.md    # Widget requirements, configs
└── ideas/
    ├── ccstatusline-analysis.md             # TypeScript/React reference
    ├── ccometixline-analysis.md             # Rust Segment trait patterns
    ├── glm-plan-usage-api.md                # GLM API endpoints
    ├── glm-coding-plan-details.md           # Model tiers, pricing
    ├── claude-code-statusline-official.md   # Official JSON schema
    └── nerd-fonts-icons.md                  # Icon reference
```

**When designing:** Read all `ideas/` files first for architecture patterns.
**When implementing:** Follow widget requirements from `brainstorm-custom-status-line.md`.

---

## Key Design Decisions (From Exploration)

1. **Block Time Calculation:** Fixed UTC schedule (00:00, 05:00, 10:00, 15:00, 20:00) rather than empirical detection. Simpler and reliable.

2. **GLM vs Claude:** This tool tracks GLM Coding Plan quotas (5-hour blocks), NOT Claude model-specific blocks. They are separate systems.

3. **MCP Detection:** Manual configuration only. Claude Code doesn't expose active MCP servers in JSON input, and transcript parsing is too complex.

4. **No Cost Tracking:** User doesn't want it. Focus on quota percentages and time remaining.

5. **Model Multiplier:** Displayed inline with model name: `GLM-5 (3×)` not as separate widget.

---

## Input JSON Schema (Claude Code)

```typescript
interface ClaudeCodeInput {
  hook_event_name?: string;
  session_id?: string;
  transcript_path?: string;    // Path to .jsonl for parsing context/cache
  cwd?: string;                // Current working directory
  model?: string | { id?: string; display_name?: string };
  workspace?: { current_dir?: string; project_dir?: string };
  version?: string;
  output_style?: { name?: string };
  cost?: { total_cost_usd?: number; total_duration_ms?: number };
}
```

---

## Claude Code Configuration

Install and enable:

```json
// ~/.claude/settings.json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline-cc",
    "padding": 0
  }
}
```

Or use `/statusline` command:
```
/statusline use ~/.claude/statusline-cc
```

---

## Development Commands (When Implemented)

```bash
# Build
bun build src/main.ts --compile --outfile=dist/statusline-cc

# Run locally
bun run src/main.ts

# Link for development
bun link

# Run tests
bun test

# Lint
bun run lint
```

---

## Distribution Strategy

1. Build single binary via `bun build --compile`
2. Package as npm module with platform-specific binaries
3. Users install via `npm install -g status-line-cc`
4. Binary placed in `node_modules/.bin/` for easy PATH access

Inspired by CCometixLine's npm distribution approach.
