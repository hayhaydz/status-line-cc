#!/bin/bash

# Task Tracker Hook Script
#
# Tracks active subagents with model-specific info using FIFO queue correlation.
#
# Usage: task-tracker.sh <pre-tool|agent-start|agent-stop|count|cleanup>
#
# Correlation strategy:
#   PreToolUse fires before agent spawns (has tool_input.model)
#   SubagentStart fires when agent spawns (has agent_id)
#   They fire in same order per agent, so FIFO queue works for correlation
#
# Compatible with bash 3.2+ (macOS default)

set -euo pipefail

# Directories
TRACK_DIR="${HOME}/.claude/statusline-hyz-cc.d/active-tasks"
QUEUE_FILE="$TRACK_DIR/.model-queue"
BG_DIR="$TRACK_DIR/bg"

mkdir -p "$BG_DIR"
touch "$QUEUE_FILE"

ACTION="${1:-}"

# Debug logging
DEBUG_LOG="/tmp/task-tracker-debug.log"
log() {
  echo "$(date): $1" >> "$DEBUG_LOG"
}

log "Script called with args: $*"

# Read stdin if available
INPUT=""
if [ -p /dev/stdin ] || [ ! -t 0 ]; then
  INPUT=$(cat)
fi

log "[$ACTION] Input length: ${#INPUT}"

# Simple locking using mkdir (atomic on all Unix systems)
LOCK_DIR="$TRACK_DIR/.lock_dir"

acquire_lock() {
  local i=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    i=$((i + 1))
    if [ $i -ge 100 ]; then
      log "Lock acquisition timeout"
      return 1
    fi
    sleep 0.01
  done
  return 0
}

release_lock() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

case "$ACTION" in

  # Called from PreToolUse hook on Task tool
  pre-tool)
    TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
    if [ "$TOOL_NAME" != "Task" ]; then
      log "[pre-tool] Not Task tool: $TOOL_NAME"
      exit 0
    fi

    MODEL_TIER=$(echo "$INPUT" | jq -r '.tool_input.model // empty')
    if [ -z "$MODEL_TIER" ]; then
      MODEL_TIER="unknown"
    fi

    # Convert tier to model ID via env var, fallback to tier name
    TIER_UPPER=$(echo "$MODEL_TIER" | tr '[:lower:]' '[:upper:]')
    MODEL_ID=$(printenv "ANTHROPIC_DEFAULT_${TIER_UPPER}_MODEL" 2>/dev/null || true)
    if [ -z "$MODEL_ID" ]; then
      MODEL_ID="$MODEL_TIER"
    fi

    log "[pre-tool] Pushing model: $MODEL_ID (tier: $MODEL_TIER)"

    acquire_lock
    echo "$MODEL_ID" >> "$QUEUE_FILE"
    release_lock
    ;;

  # Called from SubagentStart
  agent-start)
    AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // empty')
    if [ -z "$AGENT_ID" ]; then
      log "[agent-start] No agent_id in input"
      exit 0
    fi

    log "[agent-start] Agent ID: $AGENT_ID"

    acquire_lock
    # Pop model from queue (FIFO)
    MODEL=$(head -n1 "$QUEUE_FILE" 2>/dev/null || echo "unknown")
    # Remove first line (macOS compatible)
    sed -i '' '1d' "$QUEUE_FILE" 2>/dev/null || true

    # Write agent_id -> model mapping
    echo "$MODEL" > "$BG_DIR/$AGENT_ID"
    log "[agent-start] Mapped agent $AGENT_ID to model $MODEL"
    release_lock
    ;;

  # Called from SubagentStop
  agent-stop)
    AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // empty')
    if [ -z "$AGENT_ID" ]; then
      log "[agent-stop] No agent_id in input"
      exit 0
    fi

    log "[agent-stop] Removing agent: $AGENT_ID"

    acquire_lock
    rm -f "$BG_DIR/$AGENT_ID" 2>/dev/null || true
    release_lock
    ;;

  # Query: returns model counts in format "model1:count1,model2:count2"
  count)
    acquire_lock

    # Use temp file to avoid subshell variable issue (bash 3.2 compatible)
    RESULT_FILE=$(mktemp)
    if [ -d "$BG_DIR" ] && [ -n "$(ls "$BG_DIR" 2>/dev/null)" ]; then
      # Read all model files and count with sort/uniq, format as model:count
      for f in "$BG_DIR"/*; do
        [ -f "$f" ] && cat "$f" 2>/dev/null
      done | sort | uniq -c | awk '{printf "%s%s:%d", (NR>1?",":""), $2, $1}' > "$RESULT_FILE"
      cat "$RESULT_FILE"
    else
      echo "0"
    fi
    rm -f "$RESULT_FILE" 2>/dev/null

    release_lock
    ;;

  # Safety: prune stale files older than 30min
  cleanup)
    find "$BG_DIR" -type f -mmin +30 -delete 2>/dev/null || true
    ;;

  *)
    echo "Usage: $0 <pre-tool|agent-start|agent-stop|count|cleanup>" >&2
    exit 1
    ;;

esac
