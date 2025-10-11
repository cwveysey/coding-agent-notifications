#!/bin/bash
# Wrapper to run Claude Code with terminal logging
# This captures all output to a log file that the watcher can monitor

LOG_FILE="$HOME/.claude/claude-output.log"

# Create/clear log file
> "$LOG_FILE"

echo "Starting Claude Code with logging enabled..."
echo "Output will be logged to: $LOG_FILE"
echo ""

# Run claude with script command to capture all terminal output
# The -q flag makes script quiet (doesn't announce itself)
# We use tee to both display AND log output
exec script -q "$LOG_FILE" claude "$@"
