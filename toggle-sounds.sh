#!/bin/bash
# Toggle Claude Code tool sounds on/off
# Usage: bash ~/.claude/scripts/toggle-sounds.sh [on|off]

SETTINGS_FILE="$HOME/.claude/settings.json"
FLAG_FILE="$HOME/.claude/.sounds-enabled"

enable_sounds() {
    touch "$FLAG_FILE"
    echo "✅ Tool sounds ENABLED"
    echo "Sounds will play before each tool use"
    echo "To disable: bash ~/.claude/scripts/toggle-sounds.sh off"
}

disable_sounds() {
    rm -f "$FLAG_FILE"
    echo "🔇 Tool sounds DISABLED"
    echo "To enable: bash ~/.claude/scripts/toggle-sounds.sh on"
}

# Check current state
if [[ -f "$FLAG_FILE" ]]; then
    CURRENT_STATE="enabled"
else
    CURRENT_STATE="disabled"
fi

# Handle toggle
if [[ "$1" == "on" ]]; then
    enable_sounds
elif [[ "$1" == "off" ]]; then
    disable_sounds
elif [[ "$1" == "status" ]]; then
    echo "Tool sounds are currently: $CURRENT_STATE"
else
    # Toggle current state
    if [[ "$CURRENT_STATE" == "enabled" ]]; then
        disable_sounds
    else
        enable_sounds
    fi
fi
