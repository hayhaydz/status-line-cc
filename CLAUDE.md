# status-line-cc

A lightweight CLI status line tool for Claude Code, optimized for GLM Coding Plan users.

## Purpose

Displays real-time status information in Claude Code's status bar: git branch, model name, context usage, quota tracking, and block time remaining. Built specifically for GLM API quota tracking rather than Claude's native model features.

## Architecture

```
stdin (JSON) → parse → widgets → format → stdout
```

**Core principle:** Stateless, widget-based pipeline. Each widget is self-contained, takes the parsed input, and returns a formatted string. No TUI, no React, no configuration UI.

## Widget System

Widgets are registered in a central registry and rendered in order. Each widget:
1. Receives parsed Claude Code JSON input
2. Collects its data (git, API calls, file parsing)
3. Returns a formatted string segment

Widgets handle their own caching and error handling silently.

## Block Schedule

Uses a **drifting 5-day rotation** anchored to a known reset time. Because 24 hours isn't divisible by 5, the schedule drifts backward by 1 hour each day, repeating every 5 days. The anchor and cycle logic live in `src/util/time.ts`.

## Configuration

Supports three icon modes (nerdfont, emoji, text) and multiple color themes. Configuration is JSON-based with per-widget enable/disable options. Default mode is text/monochrome for maximum compatibility.

## Distribution

Built as a single binary via Bun's compile feature. Distributed as an npm package with platform-specific binaries.

## Key Files

| Path | Purpose |
|------|---------|
| `src/main.ts` | Entry point, widget registration |
| `src/widgets/*.ts` | Individual widget implementations |
| `src/util/time.ts` | Block schedule calculation |
| `src/util/format.ts` | Output formatting utilities |
| `src/hooks/*.ts` | Hook handlers for subagent tracking |
| `src/cli/hook-handler.ts` | Hook CLI entry point |

## Hook System

The binary supports `--hook <action>` for Claude Code hook integration. See `docs/hook-setup.md` for configuration details.
