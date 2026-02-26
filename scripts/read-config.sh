#!/bin/bash
# Simple YAML config reader for audio-notifier.yaml
# Usage: source read-config.sh
#
# Note: This is a minimal parser for our specific flat YAML structure.
# It handles "key: value" lines with section tracking. It does NOT handle
# multiline values, flow sequences, or complex YAML features.

CONFIG_FILE="$HOME/.claude/audio-notifier.yaml"

# Default values (if config doesn't exist)
SOUND_ENABLED=true
SOUND_FILE="/System/Library/Sounds/Submarine.aiff"
SOUND_RANDOM=false
SOUND_AVAILABLE_SOUNDS=()
SOUND_PROJECT_SOUNDS=()
MIN_INTERVAL=5
AUDIO_ENABLED=true
TERMINAL_NOTIFIER_ENABLED=true
TERMINAL_NOTIFIER_TITLE="Claude Code"
TERMINAL_NOTIFIER_SUBTITLE="Notification"
NTFY_ENABLED=false
NTFY_TOPIC=""
NTFY_SERVER="https://ntfy.sh"
NTFY_PRIORITY="default"
INACTIVITY_ENABLED=true
INACTIVITY_TIMEOUT=30
INACTIVITY_MESSAGE="Claude may be waiting for input"
LOG_NOTIFICATIONS=true
LOG_FILE="$HOME/.claude/notifications.log"
DEBUG=false
DEBUG_FILE="$HOME/.claude/watcher-debug.log"

CURRENT_SECTION=""

# Read config if it exists
if [[ -f "$CONFIG_FILE" ]]; then
    while IFS= read -r line; do
        # Strip comments and trailing whitespace
        line="${line%%#*}"
        # Skip empty lines
        [[ -z "${line// }" ]] && continue

        # Detect section headers (lines ending with ":" and no value after it)
        if [[ "$line" =~ ^([a-z_]+):$ ]] || [[ "$line" =~ ^([a-z_]+):[[:space:]]*$ ]]; then
            CURRENT_SECTION="${BASH_REMATCH[1]}"
            continue
        fi

        # Parse "key: value" lines (split on first colon only)
        if [[ "$line" =~ ^[[:space:]]*([a-z_]+):[[:space:]]+(.*) ]]; then
            key="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"
            # Trim trailing whitespace from value
            value="${value%"${value##*[![:space:]]}"}"
        else
            continue
        fi

        # Map YAML keys to variables
        case "$key" in
            enabled)
                if [[ "$CURRENT_SECTION" == "sound" ]]; then
                    SOUND_ENABLED=$value
                elif [[ "$CURRENT_SECTION" == "audio" ]]; then
                    AUDIO_ENABLED=$value
                elif [[ "$CURRENT_SECTION" == "terminal_notifier" ]]; then
                    TERMINAL_NOTIFIER_ENABLED=$value
                elif [[ "$CURRENT_SECTION" == "ntfy" ]]; then
                    NTFY_ENABLED=$value
                elif [[ "$CURRENT_SECTION" == "inactivity" ]]; then
                    INACTIVITY_ENABLED=$value
                fi
                ;;
            file) SOUND_FILE=$value ;;
            random) SOUND_RANDOM=$value ;;
            min_interval) MIN_INTERVAL=$value ;;
            title) TERMINAL_NOTIFIER_TITLE=$value ;;
            subtitle) TERMINAL_NOTIFIER_SUBTITLE=$value ;;
            topic) NTFY_TOPIC=$value ;;
            server) NTFY_SERVER=$value ;;
            priority) NTFY_PRIORITY=$value ;;
            timeout) INACTIVITY_TIMEOUT=$value ;;
            message) INACTIVITY_MESSAGE=$value ;;
            log_notifications) LOG_NOTIFICATIONS=$value ;;
            log_file) LOG_FILE="${value/#\~/$HOME}" ;;
            debug) DEBUG=$value ;;
            debug_file) DEBUG_FILE="${value/#\~/$HOME}" ;;
        esac
    done < "$CONFIG_FILE"
fi

# Export variables for use in other scripts
export SOUND_ENABLED SOUND_FILE SOUND_RANDOM MIN_INTERVAL
export AUDIO_ENABLED TERMINAL_NOTIFIER_ENABLED TERMINAL_NOTIFIER_TITLE TERMINAL_NOTIFIER_SUBTITLE
export NTFY_ENABLED NTFY_TOPIC NTFY_SERVER NTFY_PRIORITY
export INACTIVITY_ENABLED INACTIVITY_TIMEOUT INACTIVITY_MESSAGE
export LOG_NOTIFICATIONS LOG_FILE DEBUG DEBUG_FILE
