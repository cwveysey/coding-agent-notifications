# Duplicate Output Bug - Troubleshooting Log

## Issue Description

Terminal output is being printed multiple times (2-6x) when it should only print once. This affects all terminal output in Claude Code sessions.

## Root Cause Analysis

### Discovered Issues

1. **Multiple Claude Sessions Running Simultaneously**
   - Found 2 active Claude Code sessions:
     - PID 26223 (started 8:44PM previous day)
     - PID 30136 (started 7:13AM current day)
   - Each session has hooks that fire, causing duplicate notifications/output

2. **Multiple Watcher Processes (FIXED)**
   - Previously had 3 instances of `watch-claude-questions.sh` running
   - Fixed by running: `pkill -f "watch-claude-questions.sh"`
   - Verified fixed with: `ps aux | grep "watch-claude" | grep -v grep`
   - Status: ✅ **RESOLVED**

3. **Hooks Configuration**
   - Location: `~/.config/claude/settings.json` or `~/.claude/settings.json`
   - Hooks fire for EACH active Claude session
   - Current hook configuration:
     ```json
     {
       "hooks": {
         "Notification": [{
           "type": "command",
           "command": "bash ~/.claude/scripts/smart-notify.sh notification"
         }],
         "Stop": [{
           "type": "command",
           "command": "bash ~/.claude/scripts/smart-notify.sh stop"
         }]
       }
     }
     ```

## Resolution Attempts

### ✅ Completed
- [x] Killed duplicate watcher processes
- [x] Verified no watchers running
- [x] Identified multiple Claude sessions

### 🔄 In Progress
- [ ] Close old Claude session (8:44PM session)
- [ ] Verify only one Claude session remains
- [ ] Test if duplicate output is resolved

### 🧪 To Test After Closing Session
```bash
# 1. Verify only one Claude session
ps aux | grep "claude" | grep -v grep

# 2. Should see only:
#    - One "claude" process (current session)
#    - One "script" process (logging wrapper)

# 3. Test output
echo "test"
# Should print only once
```

## System Architecture

### Logging Setup
- **Wrapper**: `~/.zshrc` defines `claude()` function
- **Script command**: `script -qa ~/.claude/claude-output.log "$CLAUDE_BIN" code "$@"`
- **Single log file**: `~/.claude/claude-output.log` logs ALL Claude sessions
- **Per-session hooks**: Each Claude session has its own hook instances

### Key Files
- `~/.zshrc` - Claude wrapper function with logging
- `~/.claude/scripts/smart-notify.sh` - Notification handler
- `~/.claude/audio-notifier.yaml` - Configuration
- `~/.config/claude/settings.json` - Hooks configuration

## Hypothesis

**Multiple Claude sessions = Multiple hook instances = Duplicate output**

When you have N Claude sessions running:
- Each session fires hooks independently
- Each hook execution runs `smart-notify.sh`
- Total executions = N × (number of hooks)
- With 2 sessions: Everything runs 2x

## Expected Behavior After Fix

With only ONE Claude session running:
- Hooks fire once per event
- Output prints once
- Notifications play once
- No duplicates

## If Issue Persists After Closing Sessions

### Additional Checks

1. **Check for orphaned hooks**
   ```bash
   ps aux | grep "smart-notify\|select-sound\|afplay" | grep -v grep
   ```

2. **Check Claude Code settings location**
   ```bash
   # Find settings file
   find ~ -name "settings.json" 2>/dev/null | grep -i claude

   # Check for duplicate hook entries
   cat ~/.config/claude/settings.json | jq '.hooks'
   ```

3. **Verify script wrapper not duplicating**
   ```bash
   # Check .zshrc for multiple claude() definitions
   grep -n "^claude()" ~/.zshrc
   ```

4. **Check for multiple terminal sessions with same project**
   ```bash
   # Show all terminal sessions and their working directories
   ps aux | grep "bash\|zsh" | grep -v grep
   ```

5. **Nuclear option - restart terminal app**
   - Close ALL terminal windows/tabs
   - Quit Terminal.app / iTerm2 completely
   - Reopen and start fresh

## Questions for Next Session

1. Did closing the old Claude session (8:44PM) resolve the issue?
2. How many Claude sessions are you running now?
3. Are you still seeing duplicate output? If yes, how many duplicates?
4. What command produces the duplicate output?

## Related Files

- This repo: `/Users/cooperveysey/Desktop/Development/Side projects/audio-notifications-for-claude-code-activity/`
- Scripts location: `~/.claude/scripts/`
- Config: `~/.claude/audio-notifier.yaml`
- Hooks config: `~/.config/claude/settings.json` or similar

## Session Context

Working on: Audio notifications for Claude Code project
Task: Setting up and troubleshooting notification system
Status: Porting code to dedicated repo at `/Users/cooperveysey/Desktop/Development/Side projects/audio-notifications-for-claude-code-activity/`

---

**Last Updated**: 2025-10-13 (during session ending ~7:30AM)
**Status**: Awaiting test after closing duplicate Claude session
