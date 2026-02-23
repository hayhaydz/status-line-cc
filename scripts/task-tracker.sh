#!/bin/bash
# Task Tracker Hook Script
#
# Creates/removes task files for tracking active subagent tasks.
#
# Usage: task-tracker.sh <start|end>
#
# Required: jq
#
# Input: JSON via stdin (provided by Claude Code hooks):
#   {
#     "session_id": "...",
#     "tool_name": "Task",
#     "tool_input": { "model": "haiku", ... },
#     ...
#   }

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract fields from JSON
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
MODEL_TIER=$(echo "$INPUT" | jq -r '.tool_input.model // empty')

# Only track Task tool invocations
if [ "$TOOL_NAME" != "Task" ]; then
  exit 0
fi

# Skip if we couldn't determine model tier
if [ -z "$MODEL_TIER" ]; then
  exit 0
fi

# Convert tier to uppercase and get env var (e.g., haiku -> ANTHROPIC_DEFAULT_HAIKU_MODEL)
# Using tr for bash 3.2 compatibility (macOS)
TIER_UPPER=$(echo "$MODEL_TIER" | tr '[:lower:]' '[:upper:]')
MODEL_ID=$(printenv "ANTHROPIC_DEFAULT_${TIER_UPPER}_MODEL" 2>/dev/null || true)

# Fallback to tier name if env var not set
if [ -z "$MODEL_ID" ]; then
  MODEL_ID="$MODEL_TIER"
fi

# Skip if no session ID
if [ -z "$SESSION_ID" ]; then
  exit 0
fi

SESSION_DIR="/tmp/claude-sl-$SESSION_ID"

# Generate unique ID for this task (use timestamp + PID)
TASK_ID=$(date +%s%N 2>/dev/null || date +%s)$$

# Delimiter must match TASK_DELIMITER in task-tracker.ts
TASK_FILE="${SESSION_DIR}/${MODEL_ID}-call_${TASK_ID}"

case "$1" in
  start)
    mkdir -p "$SESSION_DIR"
    touch "$TASK_FILE"
    ;;
  end)
    # Remove all task files for this model
    rm -f "$SESSION_DIR/${MODEL_ID}-call_"* 2>/dev/null || true
    ;;
  *)
    echo "Usage: $0 <start|end>" >&2
    exit 1
    ;;
esac
