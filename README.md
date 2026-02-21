# statusline-hyz-cc

A lightweight, custom Claude Code CLI status line for GLM Coding Plan users.

## Features

- **Git Status** - Branch name with staged/modified file counts
- **Model Display** - Shows model name with concurrency multiplier
- **Concurrency** - Displays current model's concurrency limit
- **Context** - Token usage percentage from transcript parsing
- **Block Time** - 5-hour GLM block time remaining (fixed UTC schedule)
- **GLM Quota** - Real-time quota percentage from API

## Installation

### From Source

```bash
# Clone the repository
git clone <repo-url>
cd status-line-cc

# Build and install
bun run install
```

This builds the binary and installs it to `~/.claude/statusline-hyz-cc/`.

## Claude Code Configuration

Add to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline-hyz-cc/statusline-hyz-cc",
    "padding": 0
  }
}
```

Or use the command:

```bash
/statusline use ~/.claude/statusline-hyz-cc/statusline-hyz-cc
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_BASE_URL` | GLM API base URL | `https://api.z.ai/api/anthropic` |
| `ANTHROPIC_AUTH_TOKEN` | GLM API auth token | *required* |
| `STATUSLINE_VERBOSE` | Enable debug logging | `false` |

## Configuration

Configuration is loaded in this priority order:

1. **Environment variables** (highest)
2. **Project config** - `.statusline-hyz-cc/config.json` (searched upward from cwd)
3. **Global config** - `~/.claude/statusline-hyz-cc/config.json`
4. **Built-in defaults** (lowest)

### Example Global Config

`~/.claude/statusline-hyz-cc/config.json`:

```json
{
  "format": "compact",
  "verbose": false,
  "cacheTTL": {
    "glm": 300000,
    "modelUsage": 900000
  },
  "widgets": {
    "git": {
      "enabled": true,
      "icon": "",
      "format": "compact"
    },
    "model": {
      "enabled": true,
      "icon": ""
    },
    "glm": {
      "enabled": true
    }
  },
  "concurrencyLimits": {
    "glm-5": 3,
    "glm-4.7": 5,
    "glm-4.5": 10
  }
}
```

### Output Formats

| Format | Description |
|--------|-------------|
| `compact` | Short labels, compact spacing (default) |
| `detailed` | Full labels, more spacing |
| `minimal` | Icons only, minimal spacing |

### Widget Configuration

Each widget can be configured individually:

```json
{
  "widgets": {
    "git": {
      "enabled": true,
      "icon": "",
      "format": "compact"
    }
  }
}
```

## Development

```bash
# Run locally
bun run dev

# Build
bun run build

# Run tests
bun test
```

## Architecture

```
stdin (JSON from Claude Code)
  → parse input
  → load config
  → render widgets concurrently
  → format output
  → stdout (status line)
```

## License

MIT
