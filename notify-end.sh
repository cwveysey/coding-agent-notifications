#!/bin/bash
# ~/.claude/scripts/notify-end.sh
set -euo pipefail

# 🔎 Breadcrumb: prove the hook ran + where
mkdir -p ~/.claude && echo "$(date '+%F %T') stop-hook fired in $(pwd)" >> ~/.claude/stop-hook.log || true

INPUT=$(cat)
SESSION_DIR=$(basename "$(pwd)")
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path' | sed "s|^~|$HOME|")

MSG="Task completed"
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
  [ -n "${MSG// }" ] || MSG="Task completed"
fi

MSG=${MSG:0:120}
TITLE="ClaudeCode (${SESSION_DIR}) Task Done"
export MSG TITLE

# --- begin: robust notification section ---

# Always play a quick chime so you get feedback even if banners are blocked
afplay /System/Library/Sounds/Glass.aiff >/dev/null 2>&1 || true

# Prefer terminal-notifier (try PATH, then common absolute paths)
if command -v terminal-notifier >/dev/null 2>&1; then
  terminal-notifier -message "$MSG" -title "$TITLE" -sound default || true
  exit 0
elif [ -x /opt/homebrew/bin/terminal-notifier ]; then
  /opt/homebrew/bin/terminal-notifier -message "$MSG" -title "$TITLE" -sound default || true
  exit 0
elif [ -x /usr/local/bin/terminal-notifier ]; then
  /usr/local/bin/terminal-notifier -message "$MSG" -title "$TITLE" -sound default || true
  exit 0
fi

# Next preference: alerter (also reliable)
if command -v alerter >/dev/null 2>&1; then
  alerter -message "$MSG" -title "$TITLE" -sound Glass || true
  exit 0
fi

# Final fallback: JXA (osascript)
osascript -l JavaScript <<'JXA'
ObjC.import('stdlib');
const app = Application.currentApplication();
app.includeStandardAdditions = true;
const msg   = $.getenv('MSG')   ? ObjC.unwrap($.getenv('MSG'))   : 'Task completed';
const title = $.getenv('TITLE') ? ObjC.unwrap($.getenv('TITLE')) : 'ClaudeCode';
try {
  app.displayNotification(msg, { withTitle: title, soundName: 'Glass' });
} catch (e) {
  try { app.displayNotification(msg, { withTitle: title }); } catch (_) {}
}
JXA

# --- end: robust notification section ---