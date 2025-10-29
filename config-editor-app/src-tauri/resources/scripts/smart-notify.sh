#!/bin/bash
# Smart notification system for Claude Code (Hooks-Only Approach)
#
# This script handles both Notification and Stop hooks to provide
# comprehensive notification coverage.
#
# Hook Types:
# - Notification: Fires when Claude needs permission OR after 60s idle
# - Stop: Fires when Claude finishes any response
#
# Usage:
#   smart-notify.sh notification    # Called by Notification hook
#   smart-notify.sh stop             # Called by Stop hook

set -eo pipefail

HOOK_TYPE="${1:-unknown}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ALWAYS log hook execution for debugging
echo "[$(date '+%F %T')] Hook fired: $HOOK_TYPE, SOUNDS_FILE_CHECK: $(ls -lh ~/.claude/.sounds-enabled 2>&1 | head -1)" >> "$HOME/.claude/hook-execution.log"

# Load configuration
if [[ -f "$SCRIPT_DIR/read-config.sh" ]]; then
    source "$SCRIPT_DIR/read-config.sh"
fi

# Check if sounds are enabled
SOUNDS_ENABLED=true
if [[ ! -f "$HOME/.claude/.sounds-enabled" ]]; then
    SOUNDS_ENABLED=false
fi

# Debug logging function
debug_log() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo "[$(date '+%F %T')] $1" >> "${DEBUG_FILE:-$HOME/.claude/smart-notify-debug.log}"
    fi
}

# Check if Do Not Disturb is active and should be respected
check_do_not_disturb() {
    # Read config setting
    local respect_dnd=$(grep "respect_do_not_disturb:" "$HOME/.claude/audio-notifier.yaml" 2>/dev/null | awk -F': ' '{print $2}' | sed 's/#.*//' | xargs)

    debug_log "DND respect setting: ${respect_dnd:-not set}"

    # Default to false if not set (play audio by default)
    if [[ "$respect_dnd" != "true" ]]; then
        debug_log "DND respect disabled, will play audio"
        return 1  # Don't skip (play audio)
    fi

    # Method 1: Check using macOS defaults (works out of box)
    # This checks if DND/Focus is visible in menu bar (indicates it's active)
    local dnd_status=$(defaults read com.apple.controlcenter "NSStatusItem Visible DoNotDisturb" 2>/dev/null)
    if [[ "$dnd_status" == "1" ]]; then
        debug_log "Do Not Disturb is active (detected via defaults), skipping audio"
        return 0  # Skip audio
    fi

    # Method 2: Check Focus mode via plutil (alternative detection)
    local focus_enabled=$(plutil -extract dnd_prefs.userPref.enabled raw ~/Library/Preferences/com.apple.ncprefs.plist 2>/dev/null)
    if [[ "$focus_enabled" == "true" || "$focus_enabled" == "1" ]]; then
        debug_log "Do Not Disturb is active (detected via plutil), skipping audio"
        return 0  # Skip audio
    fi

    debug_log "Do Not Disturb is not active, will play audio"
    return 1  # Play audio
}

# Log activity event to JSON
log_activity_event() {
    local event_type="$1"
    local audio_played="$2"
    local visual_shown="$3"
    local message="$4"
    local project="${5:-}"

    local activity_log="$HOME/.claude/activity-log.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Create log file if it doesn't exist
    if [[ ! -f "$activity_log" ]]; then
        echo "[]" > "$activity_log"
    fi

    # Truncate message to first 200 characters for preview
    local truncated_message="${message:0:200}"
    # Escape quotes and newlines for JSON (use printf for safer string handling)
    truncated_message=$(printf '%s' "$truncated_message" | sed 's/"/\\"/g' | tr '\n' ' ')

    # Store full message (up to 2000 chars) for expandable view
    local full_message="${message:0:2000}"
    full_message=$(printf '%s' "$full_message" | sed 's/"/\\"/g' | tr '\n' ' ')

    # Escape project name for JSON
    local escaped_project=$(printf '%s' "$project" | sed 's/"/\\"/g')

    # Create new event entry
    local new_event=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "event": "$event_type",
  "audio": $audio_played,
  "visual": $visual_shown,
  "message": "$truncated_message",
  "full_message": "$full_message",
  "project": "$escaped_project"
}
EOF
)

    # Append to log (keep last 50 events)
    local temp_log=$(mktemp)
    jq --argjson event "$new_event" '. += [$event] | .[-50:]' "$activity_log" > "$temp_log" 2>/dev/null && mv "$temp_log" "$activity_log" || rm -f "$temp_log"
}

# Send notification with project-specific sound
send_notification() {
    local message="$1"
    local title="${2:-Claude Code}"
    local reason="${3:-notification}"

    debug_log "Sending notification: $reason"
    debug_log "Message: ${message:0:100}"
    debug_log "SCRIPT_DIR: $SCRIPT_DIR"
    debug_log "SOUNDS_ENABLED: $SOUNDS_ENABLED"

    # Determine event type for sound selection
    local event_type="default"
    case "$reason" in
        notification-hook)
            # Check message content to determine if it's permission or inactivity
            if [[ "$message" =~ "waiting for" ]]; then
                # Skip inactivity notifications - we're notified on Stop already
                debug_log "Skipping inactivity notification (already notified on Stop)"
                return 0
            fi
            # Always use notification sound for notification hook
            event_type="notification"
            ;;
        stop-hook)
            event_type="stop"
            ;;
        pre_tool_use-hook)
            event_type="pre_tool_use"
            ;;
        post_tool_use-hook)
            event_type="post_tool_use"
            ;;
        subagent_stop-hook)
            event_type="subagent_stop"
            ;;
    esac

    # ALWAYS log event type
    echo "[$(date '+%F %T')] Event type determined: $event_type (reason: $reason)" >> "$HOME/.claude/hook-execution.log"

    debug_log "Event type: $event_type"

    # Get custom message for this event type (if configured)
    local custom_message=""
    if [[ -n "$event_type" && "$event_type" != "default" ]]; then
        # Look under the messages: section specifically
        custom_message=$(awk '/^[[:space:]]*messages:[[:space:]]*$/{flag=1;next}/^[[:space:]]*[a-z_]+:[[:space:]]*$/{flag=0}flag && /^[[:space:]]*'"$event_type"':[[:space:]]*/{gsub(/^[[:space:]]*'"$event_type"':[[:space:]]*"|"[[:space:]]*$/,"");print;exit}' "$HOME/.claude/audio-notifier.yaml" 2>/dev/null)
    fi
    debug_log "Custom message for $event_type: ${custom_message:-none}"

    # Detect project name from git repo toplevel or working directory
    local detected_project=""

    # Try to get git toplevel directory name
    if command -v git >/dev/null 2>&1; then
        detected_project=$(cd "${PWD:-/tmp}" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null | xargs basename 2>/dev/null)
    fi

    # Fallback to current directory name
    if [[ -z "$detected_project" ]]; then
        detected_project=$(basename "${PWD:-/tmp}" 2>/dev/null)
    fi

    [[ -z "$detected_project" || "$detected_project" == "/" ]] && detected_project="claude-session"

    # Select sound for current project and event
    debug_log "About to select sound..."
    local sound="/System/Library/Sounds/Submarine.aiff"
    if [[ -f "$SCRIPT_DIR/select-sound.sh" ]]; then
        debug_log "select-sound.sh found, sourcing..."
        if EVENT_TYPE="$event_type" PROJECT_NAME="$detected_project" source "$SCRIPT_DIR/select-sound.sh" 2>&1; then
            sound="${SELECTED_SOUND:-$sound}"
            debug_log "Selected sound: $sound (source: ${SOUND_SOURCE:-unknown}, project: ${PROJECT_NAME:-unknown}, event: $event_type)"
        else
            debug_log "ERROR: Failed to source select-sound.sh (exit $?), using fallback"
        fi
    else
        debug_log "select-sound.sh NOT found, using default"
        sound="${SOUND_FILE:-/System/Library/Sounds/Submarine.aiff}"
        debug_log "Using default sound: $sound"
    fi

    # Ensure PROJECT_NAME is available for notification
    PROJECT_NAME="${PROJECT_NAME:-$detected_project}"

    # ALWAYS log sound selection
    echo "[$(date '+%F %T')] Sound selected: $sound, SOUNDS_ENABLED=$SOUNDS_ENABLED, exists=$([ -f "$sound" ] && echo YES || echo NO)" >> "$HOME/.claude/hook-execution.log"

    debug_log "Sound variable set to: $sound"
    debug_log "Checking if should play: SOUNDS_ENABLED=$SOUNDS_ENABLED, file exists=$([ -f "$sound" ] && echo yes || echo no)"

    # Track whether audio/visual were actually triggered
    local audio_played="false"
    local visual_shown="false"

    # Check if audio should be skipped due to Do Not Disturb
    if check_do_not_disturb; then
        debug_log "Skipping audio due to Do Not Disturb"
        echo "[$(date '+%F %T')] SKIPPED: DND active" >> "$HOME/.claude/hook-execution.log"
    elif [[ "$SOUNDS_ENABLED" == "true" && -f "$sound" ]]; then
        debug_log "About to play sound: $sound"
        echo "[$(date '+%F %T')] PLAYING: $sound" >> "$HOME/.claude/hook-execution.log"
        # Use osascript for better audio device access from hooks
        osascript -e "do shell script \"afplay $(printf '%q' "$sound")\"" >/dev/null 2>&1 &
        local pid=$!
        debug_log "Audio notification sent (osascript PID: $pid)"
        audio_played="true"
    else
        echo "[$(date '+%F %T')] SKIPPED: SOUNDS_ENABLED=$SOUNDS_ENABLED, file_exists=$([ -f "$sound" ] && echo YES || echo NO)" >> "$HOME/.claude/hook-execution.log"
        debug_log "Skipping audio: SOUNDS_ENABLED=$SOUNDS_ENABLED, sound file exists=$([ -f "$sound" ] && echo yes || echo no)"
    fi

    # Visual notification (if terminal-notifier available)
    if command -v terminal-notifier >/dev/null 2>&1; then
        # Determine title and message based on custom message availability
        local display_title
        local display_message

        if [[ -n "$custom_message" ]]; then
            # Use custom message as title (no project appended)
            display_title="$custom_message"

            # Message includes project and original message
            if [[ -n "${PROJECT_NAME:-}" && "$PROJECT_NAME" != "claude-session" ]]; then
                display_message="$PROJECT_NAME: ${message:0:180}"
            else
                display_message="${message:0:200}"
            fi
        else
            # Fallback to original behavior
            display_title="$title"
            display_message="${message:0:200}"
        fi

        # Find icon file (look in common locations)
        local icon_path=""
        if [[ -f "$SCRIPT_DIR/../icons/128x128.png" ]]; then
            icon_path="$SCRIPT_DIR/../icons/128x128.png"
        elif [[ -f "$HOME/.claude/icons/128x128.png" ]]; then
            icon_path="$HOME/.claude/icons/128x128.png"
        fi

        # ALWAYS log the terminal-notifier command
        echo "[$(date '+%F %T')] TERMINAL-NOTIFIER: title='$display_title', message='${display_message:0:50}'" >> "$HOME/.claude/hook-execution.log"

        terminal-notifier \
            -title "$display_title" \
            -message "$display_message" \
            >/dev/null 2>&1 &
        debug_log "Visual notification sent: title='$display_title', message='${display_message:0:50}'"
        visual_shown="true"
    fi

    # Log the notification
    local log_file="${LOG_FILE:-$HOME/.claude/notifications.log}"
    echo "$(date '+%F %T') [$reason] ${message:0:100}" >> "$log_file"

    # Log activity event to JSON
    log_activity_event "$event_type" "$audio_played" "$visual_shown" "$message" "${PROJECT_NAME:-}"
}

# Anti-spam check
check_spam() {
    local cooldown="${MIN_INTERVAL:-5}"
    local last_notify_file="$HOME/.claude/.last-notification-time"

    # Get current time
    local current_time=$(date +%s)

    # Get last notification time
    local last_time=0
    if [[ -f "$last_notify_file" ]]; then
        last_time=$(cat "$last_notify_file" 2>/dev/null || echo 0)
    fi

    # Calculate time since last notification
    local time_since=$((current_time - last_time))

    debug_log "Anti-spam check: ${time_since}s since last notification (cooldown: ${cooldown}s)"

    if [[ $time_since -lt $cooldown ]]; then
        debug_log "Anti-spam: Skipping notification (cooldown active)"
        return 1  # Skip notification
    fi

    # Update last notification time
    echo "$current_time" > "$last_notify_file"
    return 0  # Allow notification
}

# Handle Notification hook
handle_notification_hook() {
    debug_log "Notification hook triggered"

    # Read JSON input from stdin
    local input=$(cat)

    # Parse notification details
    local message=$(echo "$input" | jq -r '.message // "Claude needs your attention"' 2>/dev/null || echo "Claude needs your attention")
    local title="Notification from Claude"

    debug_log "Notification hook message: $message"

    # For permission requests, try to get the tool description
    if [[ "$message" =~ "needs your permission" ]]; then
        local transcript_path=$(echo "$input" | jq -r '.transcript_path' 2>/dev/null | sed "s|^~|$HOME|")

        # Validate path to prevent traversal attacks
        if [[ "$transcript_path" =~ \.\. ]]; then
            debug_log "Blocked path traversal attempt: $transcript_path"
            transcript_path=""
        fi

        if [[ -f "$transcript_path" ]]; then
            # Get last tool use description from transcript
            local tool_description=$(tail -n 200 "$transcript_path" 2>/dev/null | \
                jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type=="tool_use") | .input.description // empty' 2>/dev/null | \
                tail -n 1 | \
                tr '\n' ' ' | \
                sed 's/[[:space:]]\+/ /g')

            # Use tool description if found
            if [[ -n "$tool_description" ]]; then
                message="${tool_description}"
                debug_log "Using tool description for permission: ${message:0:100}"
            fi
        fi
    fi

    # Check anti-spam
    if ! check_spam; then
        return 0
    fi

    # Send notification
    send_notification "$message" "$title" "notification-hook"

    debug_log "Notification hook completed"
}

# Handle Stop hook
handle_stop_hook() {
    debug_log "Stop hook triggered"

    # Read JSON input from stdin
    local input=$(cat)

    # Get transcript path
    local transcript_path=$(echo "$input" | jq -r '.transcript_path' 2>/dev/null | sed "s|^~|$HOME|")

    # Validate path to prevent traversal attacks
    if [[ "$transcript_path" =~ \.\. ]]; then
        debug_log "Blocked path traversal attempt: $transcript_path"
        return 0
    fi

    if [[ ! -f "$transcript_path" ]]; then
        debug_log "Transcript not found: $transcript_path"
        return 0
    fi

    # Get last assistant message
    local last_message=$(tail -n 200 "$transcript_path" 2>/dev/null | \
        jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type=="text") | .text' 2>/dev/null | \
        tail -n 1 | \
        tr '\n' ' ' | \
        sed 's/[[:space:]]\+/ /g')

    if [[ -z "$last_message" ]]; then
        debug_log "No assistant message found in transcript"
        return 0
    fi

    debug_log "Last message: ${last_message:0:100}"

    # Check anti-spam
    if ! check_spam; then
        return 0
    fi

    # Send notification with message preview
    local preview="${last_message:0:100}"
    send_notification "$preview" "Stop notification from Claude" "stop-hook"

    debug_log "Stop hook notification sent"
}

# Handle PostToolUse hook
handle_post_tool_use_hook() {
    debug_log "PostToolUse hook triggered"

    # Read JSON input from stdin
    local input=$(cat)

    local message="Tool execution completed"
    local title="PostToolUse notification from Claude"

    # Check anti-spam
    if ! check_spam; then
        return 0
    fi

    # Send notification
    send_notification "$message" "$title" "post_tool_use-hook"

    debug_log "PostToolUse hook completed"
}

# Handle SubagentStop hook
handle_subagent_stop_hook() {
    debug_log "SubagentStop hook triggered"

    # Read JSON input from stdin
    local input=$(cat)

    local message="Subagent task completed"
    local title="SubagentStop notification from Claude"

    # Check anti-spam
    if ! check_spam; then
        return 0
    fi

    # Send notification
    send_notification "$message" "$title" "subagent_stop-hook"

    debug_log "SubagentStop hook completed"
}

# Handle PreToolUse hook
handle_pre_tool_use_hook() {
    debug_log "PreToolUse hook triggered"

    # Read JSON input from stdin
    local input=$(cat)

    local message="Permission required"
    local title="PreToolUse notification from Claude"

    # Check anti-spam
    if ! check_spam; then
        return 0
    fi

    # Send notification
    send_notification "$message" "$title" "pre_tool_use-hook"

    debug_log "PreToolUse hook completed"
}

# Main execution
case "$HOOK_TYPE" in
    notification)
        handle_notification_hook
        ;;
    stop)
        handle_stop_hook
        ;;
    pre_tool_use|PreToolUse)
        handle_pre_tool_use_hook
        ;;
    post_tool_use|PostToolUse)
        handle_post_tool_use_hook
        ;;
    subagent_stop|SubagentStop)
        handle_subagent_stop_hook
        ;;
    *)
        echo "Usage: $0 {notification|stop|pre_tool_use|post_tool_use|subagent_stop}" >&2
        echo "" >&2
        echo "This script is called by Claude Code hooks:" >&2
        echo "  notification    - Fired when Claude needs permission or after 60s idle" >&2
        echo "  stop            - Fired when Claude finishes responding" >&2
        echo "  pre_tool_use    - Fired before tool calls (permission prompts)" >&2
        echo "  post_tool_use   - Fired after tool calls complete" >&2
        echo "  subagent_stop   - Fired when subagent tasks complete" >&2
        exit 1
        ;;
esac

debug_log "Script completed successfully"

# NOTE: Event Types
#
# This hooks-only approach provides reliable notifications for:
# - Permission requests (Notification hook - when Claude needs permission to run a tool)
# - Response complete (Stop hook - when Claude finishes responding)
