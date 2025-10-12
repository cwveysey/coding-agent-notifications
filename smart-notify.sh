#!/bin/bash
# Smart notification system for Claude Code (Hooks-Only Approach)
#
# This script handles both Notification and Stop hooks to provide
# comprehensive notification coverage without brittle pattern matching.
#
# Hook Types:
# - Notification: Fires when Claude needs permission OR after 60s idle
# - Stop: Fires when Claude finishes any response
#
# Usage:
#   smart-notify.sh notification    # Called by Notification hook
#   smart-notify.sh stop             # Called by Stop hook

set -euo pipefail

HOOK_TYPE="${1:-unknown}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Send notification with project-specific sound
send_notification() {
    local message="$1"
    local title="${2:-Claude Code}"
    local reason="${3:-notification}"

    debug_log "Sending notification: $reason"
    debug_log "Message: ${message:0:100}"

    # Select sound for current project
    if [[ -f "$SCRIPT_DIR/select-sound.sh" ]]; then
        source "$SCRIPT_DIR/select-sound.sh"
        local sound="$SELECTED_SOUND"
        debug_log "Selected sound: $sound (source: $SOUND_SOURCE, project: $PROJECT_NAME)"
    else
        local sound="${SOUND_FILE:-/System/Library/Sounds/Submarine.aiff}"
        debug_log "Using default sound: $sound"
    fi

    # Audio notification
    if [[ "$SOUNDS_ENABLED" == "true" && -f "$sound" ]]; then
        afplay "$sound" >/dev/null 2>&1 &
        debug_log "Audio notification sent"
    fi

    # Visual notification (if terminal-notifier available)
    if command -v terminal-notifier >/dev/null 2>&1; then
        terminal-notifier \
            -title "$title" \
            -message "${message:0:200}" \
            -sound default \
            >/dev/null 2>&1 &
        debug_log "Visual notification sent"
    fi

    # Log the notification
    local log_file="${LOG_FILE:-$HOME/.claude/notifications.log}"
    echo "$(date '+%F %T') [$reason] ${message:0:100}" >> "$log_file"
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
    local title=$(echo "$input" | jq -r '.title // "Claude Code"' 2>/dev/null || echo "Claude Code")

    debug_log "Notification hook message: $message"

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

    # Check if message ends with question mark (indicates question)
    if [[ "$last_message" =~ \?[[:space:]]*$ ]]; then
        debug_log "Question detected in last message"

        # Check anti-spam
        if ! check_spam; then
            return 0
        fi

        # Send notification with question preview
        local preview="${last_message:0:100}"
        send_notification "$preview" "Claude Code Question" "stop-hook-question"

        debug_log "Stop hook question notification sent"
    else
        debug_log "No question detected (last message doesn't end with ?)"
    fi
}

# Main execution
case "$HOOK_TYPE" in
    notification)
        handle_notification_hook
        ;;
    stop)
        handle_stop_hook
        ;;
    *)
        echo "Usage: $0 {notification|stop}" >&2
        echo "" >&2
        echo "This script is called by Claude Code hooks:" >&2
        echo "  notification - Fired when Claude needs permission or after 60s idle" >&2
        echo "  stop         - Fired when Claude finishes responding" >&2
        exit 1
        ;;
esac

debug_log "Script completed successfully"

# NOTE: Pattern-Matching Alternative
#
# This hooks-only approach provides reliable notifications for:
# - Permission requests (Notification hook)
# - Questions in responses (Stop hook + "?" detection)
# - Idle timeout (Notification hook at 60s)
#
# If you find cases where you wanted a notification but didn't get one,
# consider the log-watching pattern-matching approach as documented in
# watch-claude-questions.sh (marked as ALTERNATIVE APPROACH).
#
# The pattern matcher watches terminal output in real-time and can catch
# edge cases the hooks might miss, but comes with trade-offs:
# - False positives (matches code, URLs, non-questions)
# - False negatives (misses questions without obvious patterns)
# - Higher maintenance (regex patterns need updates)
# - More complexity (additional process, log parsing)
#
# For most users, the hooks-only approach is recommended for reliability
# and simplicity. Enable pattern matching only if you identify specific
# notification gaps after testing the hooks system.
