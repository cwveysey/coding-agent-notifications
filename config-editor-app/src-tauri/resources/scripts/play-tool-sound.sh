#!/bin/bash
# Play sound if tool sounds are enabled
# Used by BeforeTool hook

FLAG_FILE="$HOME/.claude/.sounds-enabled"

# Only play sound if enabled
if [[ -f "$FLAG_FILE" ]]; then
    afplay /System/Library/Sounds/Submarine.aiff &>/dev/null &
fi
