#!/bin/bash
# Watch Claude Code terminal output for questions and play sound
# Usage: bash ~/.claude/scripts/watch-claude-questions.sh

LOG_FILE="$HOME/.claude/claude-output.log"
SOUND="/System/Library/Sounds/Submarine.aiff"
QUESTIONS_LOG="$HOME/.claude/questions-detected.log"
CHECK_INTERVAL=0.5

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔊 Claude Code Question Watcher${NC}"
echo -e "${YELLOW}════════════════════════════════${NC}"
echo ""

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Check if sound file exists
if [[ ! -f "$SOUND" ]]; then
    echo -e "${RED}⚠️  Sound file not found: $SOUND${NC}"
    exit 1
fi

echo -e "📂 Watching: ${YELLOW}$LOG_FILE${NC}"
echo -e "🔔 Sound: ${YELLOW}$SOUND${NC}"
echo -e "📝 Question log: ${YELLOW}$QUESTIONS_LOG${NC}"
echo ""
echo -e "${GREEN}✓ Watcher is running...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Track last line to avoid duplicates
LAST_QUESTION=""

# Watch the log file for new lines ONLY (start from end, don't show existing lines)
tail -f -n 0 "$LOG_FILE" 2>/dev/null | while IFS= read -r line; do
    # Remove ANSI color codes for cleaner pattern matching
    clean_line=$(echo "$line" | sed 's/\x1b\[[0-9;]*m//g')

    # Skip empty lines
    [[ -z "$clean_line" ]] && continue

    # Look for question patterns (must be substantive questions, not just any "?")
    # Skip lines that are too short (< 15 chars) or just code/URLs
    if [[ ${#clean_line} -lt 15 ]] || [[ "$clean_line" =~ ^[[:space:]]*[\$\#\>] ]] || [[ "$clean_line" =~ ^http ]]; then
        continue
    fi

    # Match actual conversational questions
    # 1. Ends with "?" and contains common question words
    # 2. Starts with "Would you like"
    # 3. Starts with "Do you want"
    # 4. Contains "Should I"
    if [[ "$clean_line" =~ \?[[:space:]]*$ ]] && [[ "$clean_line" =~ (what|when|where|who|why|how|which|would|could|should|can|do|does|did|is|are|was|were) ]]; then
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

    # If we got here, it's a valid question
    # Avoid duplicate alerts for same question
    if [[ "$clean_line" != "$LAST_QUESTION" ]]; then
        LAST_QUESTION="$clean_line"

        # Play sound (non-blocking)
        afplay "$SOUND" 2>/dev/null &

        # Log the question
        timestamp=$(date '+%F %T')
        echo "$timestamp - ${clean_line:0:100}" >> "$QUESTIONS_LOG"

        # Print to console
        echo -e "${GREEN}🔔 $timestamp${NC} - Question detected"
        echo -e "   ${YELLOW}${clean_line:0:120}${NC}"
        echo ""
    fi
done
