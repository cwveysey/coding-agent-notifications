#!/bin/bash
# Select appropriate sound based on current project
# Usage: source select-sound.sh [project_name]

# Get project name from environment, parameter, or working directory
if [[ -n "${PROJECT_NAME:-}" ]]; then
    # Use passed PROJECT_NAME from parent script
    :  # no-op, already set
elif [[ -n "$1" ]]; then
    PROJECT_NAME="$1"
else
    # Use PWD environment variable (current working directory)
    PROJECT_NAME=$(basename "${PWD:-/tmp}" 2>/dev/null)

    # If that fails, use default
    [[ -z "$PROJECT_NAME" || "$PROJECT_NAME" == "/" ]] && PROJECT_NAME="claude-session"
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

# Check for event-specific sound first
EVENT_SOUND=""
if [[ -n "${EVENT_TYPE:-}" ]]; then
    # Look for event_sounds in YAML config (simple parsing)
    case "$EVENT_TYPE" in
        notification|permission)
            EVENT_SOUND=$(grep -E "^[[:space:]]*notification:" "$HOME/.claude/audio-notifier.yaml" 2>/dev/null | head -1 | awk -F': ' '{print $2}' | sed 's/#.*//' | xargs)
            ;;
        stop)
            EVENT_SOUND=$(grep -E "^[[:space:]]*stop:" "$HOME/.claude/audio-notifier.yaml" 2>/dev/null | head -1 | awk -F': ' '{print $2}' | sed 's/#.*//' | xargs)
            ;;
        pre_tool_use)
            EVENT_SOUND=$(grep -E "^[[:space:]]*pre_tool_use:" "$HOME/.claude/audio-notifier.yaml" 2>/dev/null | head -1 | awk -F': ' '{print $2}' | sed 's/#.*//' | xargs)
            ;;
        post_tool_use)
            EVENT_SOUND=$(grep -E "^[[:space:]]*post_tool_use:" "$HOME/.claude/audio-notifier.yaml" 2>/dev/null | head -1 | awk -F': ' '{print $2}' | sed 's/#.*//' | xargs)
            ;;
        subagent_stop)
            EVENT_SOUND=$(grep -E "^[[:space:]]*subagent_stop:" "$HOME/.claude/audio-notifier.yaml" 2>/dev/null | head -1 | awk -F': ' '{print $2}' | sed 's/#.*//' | xargs)
            ;;
        inactivity)
            EVENT_SOUND=$(grep -E "^[[:space:]]*inactivity:" "$HOME/.claude/audio-notifier.yaml" 2>/dev/null | sed 's/.*:[[:space:]]*\([^#]*\).*/\1/' | tr -d ' ')
            ;;
    esac
fi

# Handle voice: prefix for Fish Audio voices
if [[ "$EVENT_SOUND" == voice:* ]]; then
    # Map voice type to actual voice file
    VOICE_TYPE="${EVENT_SOUND#voice:}"  # Remove "voice:" prefix

    # Determine voice file path based on event type
    case "$EVENT_TYPE" in
        notification)
            VOICE_FILE="$HOME/.claude/voices/global/notification.mp3"
            ;;
        stop)
            VOICE_FILE="$HOME/.claude/voices/global/stop.mp3"
            ;;
        pre_tool_use)
            VOICE_FILE="$HOME/.claude/voices/global/pre_tool_use.mp3"
            ;;
        post_tool_use)
            VOICE_FILE="$HOME/.claude/voices/global/post_tool_use.mp3"
            ;;
        subagent_stop)
            VOICE_FILE="$HOME/.claude/voices/global/subagent_stop.mp3"
            ;;
        *)
            VOICE_FILE=""
            ;;
    esac

    # Use voice file if it exists
    if [[ -f "$VOICE_FILE" ]]; then
        EVENT_SOUND="$VOICE_FILE"
    fi
fi

# Select sound (priority: event > custom project > random > default)
if [[ -n "$EVENT_SOUND" && -f "$EVENT_SOUND" ]]; then
    # Use event-specific sound
    SELECTED_SOUND="$EVENT_SOUND"
    SOUND_SOURCE="event (${EVENT_TYPE})"
elif [[ -n "$CUSTOM_SOUND" && -f "$CUSTOM_SOUND" ]]; then
    # Use custom project sound
    SELECTED_SOUND="$CUSTOM_SOUND"
    SOUND_SOURCE="custom (${PROJECT_NAME})"
elif [[ "${SOUND_RANDOM:-false}" == "true" && -n "$PROJECT_NAME" ]]; then
    # Use consistent random sound based on project name hash
    # This ensures same project always gets same sound
    PROJECT_HASH=$(echo -n "$PROJECT_NAME" | cksum | awk '{print $1}')
    SOUND_INDEX=$((PROJECT_HASH % ${#AVAILABLE_SOUNDS[@]}))
    SELECTED_SOUND="${AVAILABLE_SOUNDS[$SOUND_INDEX]}"
    SOUND_SOURCE="random (${PROJECT_NAME})"
else
    # Use default sound from config
    SELECTED_SOUND="${SOUND_FILE:-/System/Library/Sounds/Submarine.aiff}"
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
