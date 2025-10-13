#!/bin/bash
# Smarter Claude Code question detector
# Watches for TTY output from Claude Code processes

SOUND="/System/Library/Sounds/Submarine.aiff"
LOG_FILE="$HOME/.claude/questions-detected.log"
CHECK_INTERVAL=0.5  # Check every 500ms

# Function to check if a process is Claude Code
is_claude_process() {
    local pid=$1
    ps -p "$pid" -o command= | grep -q "^claude"
}

# Get Claude Code process TTY
get_claude_tty() {
    ps aux | grep "^$(whoami)" | grep "claude$" | grep -v grep | awk '{print $7}' | head -1
}

echo "Starting Claude Code question notifier..."
echo "Press Ctrl+C to stop"

LAST_SCREEN_CONTENT=""

while true; do
    # Find Claude's TTY
    TTY=$(get_claude_tty)

    if [[ -n "$TTY" ]] && [[ "$TTY" != "??" ]]; then
        # Capture last few lines of terminal
        # This is a simplified version - in practice, capturing terminal output
        # from another process is restricted by OS security

        # Alternative: Watch Claude's parent shell history or log files
        # For now, we'll use a polling approach with screen content capture

        sleep "$CHECK_INTERVAL"
    else
        echo "Claude Code not found, waiting..."
        sleep 5
    fi
done
