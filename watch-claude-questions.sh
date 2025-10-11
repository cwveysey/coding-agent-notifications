#!/bin/bash
# Watch Claude Code terminal output for questions and send notifications
# Usage: bash ~/.claude/scripts/watch-claude-questions.sh

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/read-config.sh"

# Check for .sounds-enabled flag file
SOUNDS_FLAG="$HOME/.claude/.sounds-enabled"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔊 Claude Code Question Watcher${NC}"
echo -e "${YELLOW}════════════════════════════════${NC}"
echo ""

# Create log file if it doesn't exist
OUTPUT_LOG="$HOME/.claude/claude-output.log"
touch "$OUTPUT_LOG"

# Check if sound file exists (if audio is enabled)
if [[ "$AUDIO_ENABLED" == "true" && ! -f "$SOUND_FILE" ]]; then
    echo -e "${RED}⚠️  Sound file not found: $SOUND_FILE${NC}"
    echo -e "${YELLOW}💡 Audio notifications disabled${NC}"
    AUDIO_ENABLED=false
fi

# Check if terminal-notifier is available
if [[ "$TERMINAL_NOTIFIER_ENABLED" == "true" ]]; then
    if ! command -v terminal-notifier >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  terminal-notifier not found${NC}"
        echo -e "${YELLOW}💡 Install: brew install terminal-notifier${NC}"
        TERMINAL_NOTIFIER_ENABLED=false
    fi
fi

# Show configuration
echo -e "📂 Watching: ${YELLOW}$OUTPUT_LOG${NC}"
echo -e "📝 Config: ${YELLOW}$HOME/.claude/audio-notifier.yaml${NC}"
echo ""
echo -e "${BLUE}Notifications enabled:${NC}"
[[ "$AUDIO_ENABLED" == "true" && -f "$SOUNDS_FLAG" ]] && echo -e "  ${GREEN}✓${NC} Audio (${SOUND_FILE##*/})"
[[ "$TERMINAL_NOTIFIER_ENABLED" == "true" ]] && echo -e "  ${GREEN}✓${NC} Visual (terminal-notifier)"
[[ "$NTFY_ENABLED" == "true" && -n "$NTFY_TOPIC" ]] && echo -e "  ${GREEN}✓${NC} Remote (ntfy.sh)"
echo ""
echo -e "${GREEN}✓ Watcher is running...${NC}"
echo -e "${YELLOW}Anti-spam: ${MIN_INTERVAL}s cooldown${NC}"
[[ "$INACTIVITY_ENABLED" == "true" ]] && echo -e "${YELLOW}Inactivity: ${INACTIVITY_TIMEOUT}s timeout${NC}"
echo ""

# Debug function
debug_log() {
    if [[ "$DEBUG" == "true" ]]; then
        echo "[DEBUG $(date '+%T')] $1" >> "$DEBUG_FILE"
    fi
}

# Send notification function
send_notification() {
    local question="$1"
    local timestamp=$(date '+%F %T')

    debug_log "Sending notifications for: $question"

    # Select appropriate sound for current project
    source "$SCRIPT_DIR/select-sound.sh"
    debug_log "Selected sound: $SELECTED_SOUND (source: $SOUND_SOURCE)"

    # Audio notification
    if [[ "$AUDIO_ENABLED" == "true" && -f "$SOUNDS_FLAG" ]]; then
        debug_log "Playing audio: $SELECTED_SOUND"
        afplay "$SELECTED_SOUND" 2>/dev/null &
    fi

    # Visual notification (macOS)
    if [[ "$TERMINAL_NOTIFIER_ENABLED" == "true" ]]; then
        debug_log "Sending terminal-notifier"
        terminal-notifier \
            -title "$TERMINAL_NOTIFIER_TITLE" \
            -subtitle "$TERMINAL_NOTIFIER_SUBTITLE" \
            -message "${question:0:200}" \
            -sound default \
            >/dev/null 2>&1 &
    fi

    # Remote notification (ntfy.sh)
    if [[ "$NTFY_ENABLED" == "true" && -n "$NTFY_TOPIC" ]]; then
        debug_log "Sending ntfy notification"
        curl -s -X POST "$NTFY_SERVER/$NTFY_TOPIC" \
            -H "Title: $TERMINAL_NOTIFIER_TITLE" \
            -H "Priority: $NTFY_PRIORITY" \
            -d "Question: ${question:0:200}" \
            >/dev/null 2>&1 &
    fi

    # Log the question
    if [[ "$LOG_QUESTIONS" == "true" ]]; then
        echo "$timestamp - ${question:0:100}" >> "$LOG_FILE"
    fi

    # Print to console
    echo -e "${GREEN}🔔 $timestamp${NC} - Question detected"
    if [[ -n "$PROJECT_NAME" ]]; then
        echo -e "   ${BLUE}📁 ${PROJECT_NAME}${NC} - ${SOUND_SOURCE}"
    fi
    echo -e "   🔊 $(basename "$SELECTED_SOUND" .aiff)"
    echo -e "   ${YELLOW}${question:0:120}${NC}"
    echo ""
}

# Anti-spam: Track last notification time
LAST_NOTIFICATION_TIME=0

# Track last question to avoid duplicates within same session
LAST_QUESTION=""

# Track last activity time (for inactivity detection)
LAST_ACTIVITY_TIME=$(date +%s)
echo $LAST_ACTIVITY_TIME > "$HOME/.claude/.last-activity"

# Start inactivity watcher in background (if enabled)
if [[ "$INACTIVITY_ENABLED" == "true" ]]; then
    (
        debug_log "Starting inactivity watcher (${INACTIVITY_TIMEOUT}s timeout)"
        INACTIVITY_NOTIFIED=false

        while true; do
            sleep 5

            CURRENT_TIME=$(date +%s)
            LAST_ACTIVITY=$(cat "$HOME/.claude/.last-activity" 2>/dev/null || echo "$CURRENT_TIME")
            TIME_SINCE_ACTIVITY=$((CURRENT_TIME - LAST_ACTIVITY))

            debug_log "Inactivity check: ${TIME_SINCE_ACTIVITY}s since last activity"

            if [[ $TIME_SINCE_ACTIVITY -ge $INACTIVITY_TIMEOUT && "$INACTIVITY_NOTIFIED" == "false" ]]; then
                debug_log "Inactivity threshold reached, sending notification"
                send_notification "$INACTIVITY_MESSAGE"
                INACTIVITY_NOTIFIED=true
            elif [[ $TIME_SINCE_ACTIVITY -lt $INACTIVITY_TIMEOUT ]]; then
                INACTIVITY_NOTIFIED=false
            fi
        done
    ) &
    INACTIVITY_PID=$!
    debug_log "Inactivity watcher started (PID: $INACTIVITY_PID)"
fi

# Cleanup on exit
cleanup() {
    debug_log "Shutting down watcher"
    if [[ -n "$INACTIVITY_PID" ]]; then
        kill "$INACTIVITY_PID" 2>/dev/null
    fi
    rm -f "$HOME/.claude/.last-activity"
    echo -e "\n${YELLOW}Watcher stopped${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Watch the log file for new lines ONLY (start from end)
debug_log "Starting tail on $OUTPUT_LOG"

tail -f -n 0 "$OUTPUT_LOG" 2>/dev/null | while IFS= read -r line; do
    # Update activity time
    CURRENT_TIME=$(date +%s)
    echo $CURRENT_TIME > "$HOME/.claude/.last-activity"

    # Remove ANSI color codes for cleaner pattern matching
    clean_line=$(echo "$line" | sed 's/\x1b\[[0-9;]*m//g')

    debug_log "Read line: ${clean_line:0:80}"

    # Skip empty lines
    [[ -z "$clean_line" ]] && continue

    # Look for question patterns
    # Skip lines that are too short or just code/URLs/prompts
    if [[ ${#clean_line} -lt $MIN_LENGTH ]] || \
       [[ "$clean_line" =~ ^[[:space:]]*[\$\#\>] ]] || \
       [[ "$clean_line" =~ ^http ]]; then
        continue
    fi

    # Match actual conversational questions
    if [[ "$clean_line" =~ \?[[:space:]]*$ ]] && \
       [[ "$clean_line" =~ (what|when|where|who|why|how|which|would|could|should|can|do|does|did|is|are|was|were|will|shall) ]]; then
        # Valid question
        :
    elif [[ "$clean_line" =~ ^[Ww]ould\ you\ like ]] || \
         [[ "$clean_line" =~ ^[Dd]o\ you\ want ]] || \
         [[ "$clean_line" =~ [Ss]hould\ [I|i] ]]; then
        # Valid question
        :
    else
        # Not a question we care about
        continue
    fi

    debug_log "Question detected: $clean_line"

    # Avoid duplicate alerts for same question
    if [[ "$clean_line" == "$LAST_QUESTION" ]]; then
        debug_log "Skipping duplicate question"
        continue
    fi

    # Anti-spam: Check if enough time has passed since last notification
    CURRENT_TIME=$(date +%s)
    TIME_SINCE_LAST=$((CURRENT_TIME - LAST_NOTIFICATION_TIME))

    debug_log "Time since last notification: ${TIME_SINCE_LAST}s (threshold: ${MIN_INTERVAL}s)"

    if [[ $TIME_SINCE_LAST -lt $MIN_INTERVAL ]]; then
        debug_log "Skipping notification (anti-spam)"
        echo -e "${YELLOW}⏱️  Cooldown active (${TIME_SINCE_LAST}s/${MIN_INTERVAL}s)${NC}"
        continue
    fi

    # Update tracking variables
    LAST_QUESTION="$clean_line"
    LAST_NOTIFICATION_TIME=$CURRENT_TIME

    # Send notifications
    send_notification "$clean_line"
done

# Cleanup (if loop exits)
cleanup
