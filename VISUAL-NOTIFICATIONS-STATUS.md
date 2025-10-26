# Visual Notifications Status

## Current State (as of 2025-10-25)

### ✅ Working
- **Audio notifications**: Playing correctly for all events
  - Notification hook: `notification.mp3` ✅
  - Stop hook: `stop.mp3` ✅
  - PreToolUse support: Complete parity with PostToolUse (92=92 references) ✅
- **Hook execution**: All hooks firing correctly
- **Sound selection**: Correctly selecting event-specific sounds
- **Debug logging**: Comprehensive logging in `~/.claude/hook-execution.log`

### ❌ Not Working
- **Visual notifications**: terminal-notifier is called but no notification appears
  - terminal-notifier is installed and enabled in System Settings > Notifications
  - Command executes without errors (confirmed in logs)
  - Runs in background via `&`
  - Tested both directly and via hooks - neither shows visual notification

## Technical Details

### Evidence from Logs
```
[2025-10-25 23:01:01] TERMINAL-NOTIFIER: title='Notification from Claude', message='Copy updated script to bundled resources ', icon='/Users/cooperveysey/.claude/scripts/../icons/128x128.png'
```

The command is being executed with correct parameters:
- Title: Set correctly
- Message: Set correctly
- Icon: Path exists and is valid
- Sender: `com.claude.notifier`

### What Was Tried
1. ✅ Verified terminal-notifier is installed (`/usr/local/bin/terminal-notifier`)
2. ✅ Checked System Settings > Notifications - terminal-notifier is enabled
3. ✅ Created custom app bundle (`ClaudeNotifier.app`) with waveform icon
4. ✅ Set `-sender com.claude.notifier` flag
5. ✅ Set `-contentImage` flag with valid icon path
6. ✅ Added error logging to capture terminal-notifier output
7. ✅ Tested via osascript wrapper (used by hooks)
8. ✅ Tested directly from command line

### Terminal-Notifier Command Used
```bash
terminal-notifier \
    -title "$display_title" \
    -message "$display_message" \
    -sender com.claude.notifier \
    -contentImage "$icon_path" \
    >> "$HOME/.claude/terminal-notifier-errors.log" 2>&1 &
```

### Possible Causes
1. **macOS permissions issue** - Even though terminal-notifier is "enabled", something may be blocking it
2. **Background execution issue** - Running with `&` may prevent notifications from showing
3. **Terminal environment** - Hooks run in a different environment than manual execution
4. **Focus mode / DND** - May be active even though check passes
5. **Notification Center state** - May need to be reset

## Recommended Next Steps

### Option A: Try AppleScript's Native Notifications
Replace terminal-notifier with AppleScript's `display notification`:
```bash
osascript -e "display notification \"$message\" with title \"$title\""
```

**Pros:**
- Native macOS API
- Different permission model
- May work better from hooks

**Cons:**
- Less customization (no custom icon in same way)
- Fewer options

### Option B: Debug terminal-notifier Permissions
1. Check if there's a separate permission for "notifications from scripts"
2. Try running terminal-notifier in foreground (remove `&`)
3. Check Console.app for any blocked notification messages
4. Reset Notification Center database:
   ```bash
   killall NotificationCenter
   rm ~/Library/Preferences/com.apple.notificationcenterui.plist
   ```

### Option C: Alternative Notification Tools
- **alerter**: Drop-in replacement for terminal-notifier with more features
- **Custom Swift script**: Build minimal notification sender
- **osascript with dialog**: Fallback to modal dialogs

## Files Modified

### Core Scripts
- `~/.claude/scripts/smart-notify.sh` - Main notification handler
  - Lines 211-228: terminal-notifier implementation with logging
  - Line 212: TERMINAL-NOTIFIER logging to hook-execution.log

### Bundled Resources
- `config-editor-app/src-tauri/resources/scripts/smart-notify.sh` - Synced with ~/.claude version

### Debug Logs
- `~/.claude/hook-execution.log` - Primary debug log (shows terminal-notifier is called)
- `~/.claude/terminal-notifier-errors.log` - Error output (currently empty = no errors)
- `~/.claude/notifications.log` - Notification history
- `~/.claude/smart-notify-debug.log` - DEBUG mode output (when enabled)

## Quick Test Commands

### Test terminal-notifier directly:
```bash
terminal-notifier -title "Test" -message "Direct test" -sender com.claude.notifier
```

### Test via osascript (how hooks call it):
```bash
osascript -e "do shell script \"terminal-notifier -title 'Test' -message 'Via osascript' -sender com.claude.notifier\""
```

### Test AppleScript native notification:
```bash
osascript -e 'display notification "Test message" with title "Test Title"'
```

### Check recent hook executions:
```bash
tail -20 ~/.claude/hook-execution.log
```

## Related Files

- `config-editor-app/CUSTOM_ICON_APPROACH.md` - Documentation on custom icon implementation
- `~/.claude/ClaudeNotifier.app/` - Custom app bundle for icon
- `~/.claude/icons/128x128.png` - Waveform icon file
- `~/.claude/settings.json` - Hook configuration

## Commit
Latest changes committed in: `93307d0` - "Add PreToolUse parity and fix notification hook audio"
