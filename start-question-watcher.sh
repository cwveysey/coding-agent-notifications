#!/bin/bash
# Start the Claude Code question watcher in the background
# Usage: bash ~/.claude/scripts/start-question-watcher.sh

WATCHER_SCRIPT="$HOME/.claude/scripts/watch-claude-questions.sh"
PID_FILE="$HOME/.claude/watcher.pid"
LOG_DIR="$HOME/.claude"

# Check if ANY watcher instances are running
EXISTING_PIDS=$(ps aux | grep "watch-claude-questions.sh" | grep -v grep | awk '{print $2}')

if [[ -n "$EXISTING_PIDS" ]]; then
    echo "✓ Question watcher is already running"
    echo "  Running PIDs: $EXISTING_PIDS"
    echo "  To stop: bash ~/.claude/scripts/stop-question-watcher.sh"
    exit 0
fi

# Clean up stale PID file if exists
rm -f "$PID_FILE"

# Start watcher in background
echo "Starting Claude Code question watcher..."
nohup bash "$WATCHER_SCRIPT" > "$LOG_DIR/watcher-output.log" 2>&1 &
echo $! > "$PID_FILE"

echo "✓ Watcher started (PID: $(cat $PID_FILE))"
echo "  Log: $LOG_DIR/watcher-output.log"
echo "  Questions: $LOG_DIR/questions-detected.log"
echo ""
echo "To stop: bash ~/.claude/scripts/stop-question-watcher.sh"
