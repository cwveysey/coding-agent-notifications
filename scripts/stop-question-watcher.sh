#!/bin/bash
# Stop ALL Claude Code question watcher instances
# Usage: bash ~/.claude/scripts/stop-question-watcher.sh

PID_FILE="$HOME/.claude/watcher.pid"

# Kill all instances of the watcher (not just the PID file one)
PIDS=$(ps aux | grep "watch-claude-questions.sh" | grep -v grep | awk '{print $2}')

if [[ -z "$PIDS" ]]; then
    echo "Question watcher is not running"
    rm -f "$PID_FILE"
    exit 0
fi

echo "Stopping question watcher instances..."
for PID in $PIDS; do
    echo "  Killing PID: $PID"
    kill "$PID" 2>/dev/null
done

# Clean up PID file
rm -f "$PID_FILE"

# Wait a moment and verify
sleep 1
REMAINING=$(ps aux | grep "watch-claude-questions.sh" | grep -v grep | wc -l | xargs)

if [[ "$REMAINING" -eq 0 ]]; then
    echo "✓ All watcher instances stopped"
else
    echo "⚠️  Warning: $REMAINING instance(s) still running"
    ps aux | grep "watch-claude-questions.sh" | grep -v grep
fi
