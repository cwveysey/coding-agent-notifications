#!/bin/bash
# Audio Notifier Uninstall Script
# This script safely removes audio notification hooks from Claude Code
# while preserving other customizations

set -e

SETTINGS="$HOME/.claude/settings.json"
BACKUP_DIR="$HOME/.claude/backups"

echo "==================================="
echo "Audio Notifier Uninstall Script"
echo "==================================="
echo ""

# Check if settings.json exists
if [[ ! -f "$SETTINGS" ]]; then
    echo "Error: $SETTINGS not found."
    echo "Audio notifier may not be installed."
    exit 1
fi

echo "This will:"
echo "  - Remove smart-notify.sh hooks from Claude Code"
echo "  - Delete notification scripts"
echo "  - Preserve your audio-notifier.yaml config"
echo "  - Keep any other hooks you've configured"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo ""
echo "Creating backup..."

# Create backup before uninstalling
timestamp=$(date +%s)
mkdir -p "$BACKUP_DIR"
cp "$SETTINGS" "$BACKUP_DIR/settings-pre-uninstall-$timestamp.json"
echo "Backup created: $BACKUP_DIR/settings-pre-uninstall-$timestamp.json"

echo ""
echo "Removing hooks..."

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    echo "Please install jq: brew install jq"
    echo ""
    echo "Your backup is safe at: $BACKUP_DIR/settings-pre-uninstall-$timestamp.json"
    exit 1
fi

# Remove only our hooks (those containing smart-notify.sh)
# This complex jq command:
# 1. Iterates through each hook type
# 2. For arrays, filters out entries containing smart-notify.sh
# 3. Removes empty arrays
# 4. Preserves all other hooks
jq '
  if .hooks then
    .hooks |= (
      to_entries |
      map(
        .value |= (
          if type == "array" then
            map(
              select(
                .hooks // [] |
                map(.command // "" | contains("smart-notify.sh")) |
                any |
                not
              )
            ) |
            if length > 0 then . else empty end
          else
            .
          end
        )
      ) |
      if length > 0 then from_entries else empty end
    )
  else
    .
  end
' "$SETTINGS" > "$SETTINGS.tmp"

# Only update if jq succeeded
if [[ $? -eq 0 ]]; then
    mv "$SETTINGS.tmp" "$SETTINGS"
    echo "Hooks removed from settings.json"
else
    rm -f "$SETTINGS.tmp"
    echo "Error: Failed to update settings.json"
    echo "Your backup is safe at: $BACKUP_DIR/settings-pre-uninstall-$timestamp.json"
    exit 1
fi

echo ""
echo "Removing scripts..."

# Remove scripts
SCRIPTS_REMOVED=0
for script in "smart-notify.sh" "select-sound.sh" "read-config.sh"; do
    script_path="$HOME/.claude/scripts/$script"
    if [[ -f "$script_path" ]]; then
        rm -f "$script_path"
        echo "  Removed: $script"
        SCRIPTS_REMOVED=$((SCRIPTS_REMOVED + 1))
    fi
done

# Remove .sounds-enabled
if [[ -f "$HOME/.claude/.sounds-enabled" ]]; then
    rm -f "$HOME/.claude/.sounds-enabled"
    echo "  Removed: .sounds-enabled"
fi

# Remove global voice files
if [[ -d "$HOME/.claude/voices/global" ]]; then
    rm -rf "$HOME/.claude/voices/global"
    echo "  Removed: global voice files"
fi

# Remove installation manifest
if [[ -f "$HOME/.claude/audio-notifier-install.json" ]]; then
    rm -f "$HOME/.claude/audio-notifier-install.json"
    echo "  Removed: installation manifest"
fi

echo ""
echo "==================================="
echo "Uninstall Complete!"
echo "==================================="
echo ""
echo "What was removed:"
echo "  - $SCRIPTS_REMOVED script files"
echo "  - Smart-notify hooks from Claude Code"
echo ""
echo "What was preserved:"
echo "  - Your audio-notifier.yaml config at ~/.claude/audio-notifier.yaml"
echo "  - Any other Claude Code hooks you configured"
echo "  - All backups in ~/.claude/backups/"
echo ""
echo "Backup location:"
echo "  $BACKUP_DIR/settings-pre-uninstall-$timestamp.json"
echo ""

# Check if any other hooks remain
remaining_hooks=$(jq -r '.hooks // {} | keys | length' "$SETTINGS" 2>/dev/null || echo "0")
if [[ "$remaining_hooks" -gt 0 ]]; then
    echo "Note: You still have $remaining_hooks hook type(s) configured in Claude Code."
    echo "These were preserved during uninstall."
fi

echo ""
echo "To reinstall, simply open the Audio Notifier app again."
echo ""
