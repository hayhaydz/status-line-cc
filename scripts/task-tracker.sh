#!/bin/bash
# Task Tracker Hook Script
#
# Creates/removes task files for tracking active subagent tasks.
#
# Usage: task-tracker.sh <start|end>
#
# Required: jq
#
# Environment variables (provided by Claude Code hooks):
#   CLAUDE_SESSION_ID - The current session ID
#   TOOL_USE_ID       - Unique ID for this tool invocation
#   TOOL_INPUT        - JSON string containing tool input (including model)

set -e

# Resolve model tier to model ID via environment variables
MODEL_TIER=$(echo "$TOOL_INPUT" | jq -r '.model // empty')

# Convert tier to uppercase and get env var (e.g., haiku -> ANTHROPIC_DEFAULT_HAIKU_MODEL)
MODEL_ID=$(printenv "ANTHROPIC_DEFAULT_${MODEL_TIER^^}_MODEL" 2>/dev/null | tr -d '-' || true)

# Fallback to tier name if env var not set
if [ -z "$MODEL_ID" ]; then
  MODEL_ID="$MODEL_TIER"
fi

# Skip if we couldn't determine model
if [ -z "$MODEL_ID" ]; then
  exit 0
fi

SESSION_DIR="/tmp/claude-sl-$CLAUDE_SESSION_ID"

case "$1" in
  start)
    mkdir -p "$SESSION_DIR"
    touch "$SESSION_DIR/${MODEL_ID}-${TOOL_USE_ID}"
    ;;
  end)
    rm -f "$SESSION_DIR/${MODEL_ID}-${TOOL_USE_ID}" 2>/dev/null || true
    ;;
  *)
    echo "Usage: $0 <start|end>" >&2
    exit 1
    ;;
esac
