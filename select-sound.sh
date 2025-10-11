#!/bin/bash
# Select appropriate sound based on current project
# Usage: source select-sound.sh [project_name]

# Get project name from working directory or parameter
if [[ -n "$1" ]]; then
    PROJECT_NAME="$1"
else
    # Try to detect from claude-output.log last working directory
    PROJECT_NAME=$(grep -o "Working directory: [^[:space:]]*" "$HOME/.claude/claude-output.log" 2>/dev/null | tail -1 | awk '{print $NF}' | xargs basename 2>/dev/null)

    # Fallback to current directory
    [[ -z "$PROJECT_NAME" ]] && PROJECT_NAME=$(basename "$PWD")
fi

# Available sounds
AVAILABLE_SOUNDS=(
    "/System/Library/Sounds/Submarine.aiff"
    "/System/Library/Sounds/Glass.aiff"
    "/System/Library/Sounds/Ping.aiff"
    "/System/Library/Sounds/Tink.aiff"
    "/System/Library/Sounds/Purr.aiff"
    "/System/Library/Sounds/Pop.aiff"
    "/System/Library/Sounds/Funk.aiff"
    "/System/Library/Sounds/Hero.aiff"
    "/System/Library/Sounds/Blow.aiff"
    "/System/Library/Sounds/Bottle.aiff"
    "/System/Library/Sounds/Frog.aiff"
    "/System/Library/Sounds/Basso.aiff"
)

# Load project-specific sound mappings if exists
PROJECT_SOUNDS_FILE="$HOME/.claude/project-sounds.conf"
CUSTOM_SOUND=""

if [[ -f "$PROJECT_SOUNDS_FILE" && -n "$PROJECT_NAME" ]]; then
    # Format: project_name=sound_file.aiff
    CUSTOM_SOUND=$(grep "^${PROJECT_NAME}=" "$PROJECT_SOUNDS_FILE" 2>/dev/null | cut -d= -f2)
fi

# Select sound
if [[ -n "$CUSTOM_SOUND" && -f "$CUSTOM_SOUND" ]]; then
    # Use custom project sound
    SELECTED_SOUND="$CUSTOM_SOUND"
    SOUND_SOURCE="custom (${PROJECT_NAME})"
elif [[ "$SOUND_RANDOM" == "true" && -n "$PROJECT_NAME" ]]; then
    # Use consistent random sound based on project name hash
    # This ensures same project always gets same sound
    PROJECT_HASH=$(echo -n "$PROJECT_NAME" | cksum | awk '{print $1}')
    SOUND_INDEX=$((PROJECT_HASH % ${#AVAILABLE_SOUNDS[@]}))
    SELECTED_SOUND="${AVAILABLE_SOUNDS[$SOUND_INDEX]}"
    SOUND_SOURCE="random (${PROJECT_NAME})"
else
    # Use default sound from config
    SELECTED_SOUND="$SOUND_FILE"
    SOUND_SOURCE="default"
fi

# Fallback if selected sound doesn't exist
if [[ ! -f "$SELECTED_SOUND" ]]; then
    SELECTED_SOUND="/System/Library/Sounds/Submarine.aiff"
    SOUND_SOURCE="fallback"
fi

# Export for use in parent script
export SELECTED_SOUND
export SOUND_SOURCE
export PROJECT_NAME
