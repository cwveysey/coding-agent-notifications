#!/bin/bash
# Simple YAML config reader for audio-notifier.yaml
# Usage: source read-config.sh

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

# Read config if it exists
if [[ -f "$CONFIG_FILE" ]]; then
    # Simple YAML parsing (works for our flat structure)
    while IFS=': ' read -r key value; do
        # Remove leading/trailing whitespace and comments
        key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/#.*//')

        # Skip empty lines and section headers
        [[ -z "$key" || "$key" =~ ^# ]] && continue

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

            # Track which section we're in
            sound) CURRENT_SECTION="sound" ;;
            audio) CURRENT_SECTION="audio" ;;
            terminal_notifier) CURRENT_SECTION="terminal_notifier" ;;
            ntfy) CURRENT_SECTION="ntfy" ;;
            inactivity) CURRENT_SECTION="inactivity" ;;
            logging) CURRENT_SECTION="logging" ;;
        esac
    done < "$CONFIG_FILE"
fi

# Export variables for use in other scripts
export SOUND_ENABLED SOUND_FILE SOUND_RANDOM MIN_INTERVAL
export AUDIO_ENABLED TERMINAL_NOTIFIER_ENABLED TERMINAL_NOTIFIER_TITLE TERMINAL_NOTIFIER_SUBTITLE
export NTFY_ENABLED NTFY_TOPIC NTFY_SERVER NTFY_PRIORITY
export INACTIVITY_ENABLED INACTIVITY_TIMEOUT INACTIVITY_MESSAGE
export LOG_NOTIFICATIONS LOG_FILE DEBUG DEBUG_FILE
