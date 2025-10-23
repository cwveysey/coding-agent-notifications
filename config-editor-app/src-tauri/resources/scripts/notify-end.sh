#!/bin/bash
# ~/.claude/scripts/notify-end.sh
# Fires when Claude finishes responding (Stop hook)

set -euo pipefail

# 🔎 Breadcrumb: prove the hook ran + where
mkdir -p ~/.claude && echo "$(date '+%F %T') stop-hook fired in $(pwd)" >> ~/.claude/stop-hook.log || true

INPUT=$(cat)
SESSION_DIR=$(basename "$(pwd)")
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path' | sed "s|^~|$HOME|")

MSG="Claude finished responding"
if [ -f "$TRANSCRIPT_PATH" ]; then
  MSG=$(
    tail -n 200 "$TRANSCRIPT_PATH" \
    | jq -r '
        select(.message.role == "assistant")
        | (
            (.message.content[]? | select(.type=="text") | .text),
            (.message.content[]? // empty)
          ) // empty
      ' \
    | tail -n 1 \
    | tr "\n" " " \
    | sed 's/[[:space:]]\+/ /g'
  )
  [ -n "${MSG// }" ] || MSG="Claude finished responding"
fi

MSG=${MSG:0:120}
TITLE="ClaudeCode (${SESSION_DIR})"
export MSG TITLE

# --- Use per-project sound system ---

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/read-config.sh" ]]; then
    source "$SCRIPT_DIR/read-config.sh"
fi

# Select sound for this project
if [[ -f "$SCRIPT_DIR/select-sound.sh" ]]; then
    source "$SCRIPT_DIR/select-sound.sh" "$SESSION_DIR"
    SOUND_FILE="$SELECTED_SOUND"
else
    # Fallback to Glass if sound selection not available
    SOUND_FILE="/System/Library/Sounds/Glass.aiff"
fi

# Check if sounds are enabled
SOUNDS_ENABLED=true
if [[ ! -f "$HOME/.claude/.sounds-enabled" ]]; then
    SOUNDS_ENABLED=false
fi

# Play sound (use per-project sound for consistency)
if [[ "$SOUNDS_ENABLED" == "true" ]]; then
    afplay "$SOUND_FILE" >/dev/null 2>&1 || true
fi

# Visual notification (try multiple methods)
if command -v terminal-notifier >/dev/null 2>&1; then
  terminal-notifier -message "$MSG" -title "$TITLE" -sound default >/dev/null 2>&1 || true
elif [ -x /opt/homebrew/bin/terminal-notifier ]; then
  /opt/homebrew/bin/terminal-notifier -message "$MSG" -title "$TITLE" -sound default >/dev/null 2>&1 || true
elif [ -x /usr/local/bin/terminal-notifier ]; then
  /usr/local/bin/terminal-notifier -message "$MSG" -title "$TITLE" -sound default >/dev/null 2>&1 || true
elif command -v alerter >/dev/null 2>&1; then
  alerter -message "$MSG" -title "$TITLE" -sound Glass >/dev/null 2>&1 || true
else
  # Fallback: JXA (osascript)
  osascript -l JavaScript <<'JXA' 2>/dev/null || true
ObjC.import('stdlib');
const app = Application.currentApplication();
app.includeStandardAdditions = true;
const msg   = $.getenv('MSG')   ? ObjC.unwrap($.getenv('MSG'))   : 'Claude finished';
const title = $.getenv('TITLE') ? ObjC.unwrap($.getenv('TITLE')) : 'ClaudeCode';
try {
  app.displayNotification(msg, { withTitle: title, soundName: 'Glass' });
} catch (e) {
  try { app.displayNotification(msg, { withTitle: title }); } catch (_) {}
}
JXA
fi
