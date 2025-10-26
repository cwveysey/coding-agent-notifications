# Do Not Disturb (Focus Mode) Options

## Current Behavior

**Visual notifications:** ❌ Blocked by Do Not Disturb (as expected)
**Audio notifications:** ✅ **Still play** (always)

This is because:
- Visual notifications go through Notification Center (respects DND)
- Audio plays directly via `afplay` (bypasses DND)

---

## User Options for Audio During DND

### Option 1: **Always Play Audio** (Current) ⭐ Default
**When:** Audio plays regardless of Focus mode

**Pros:**
- ✅ Never miss important notifications
- ✅ Good for critical coding work
- ✅ Simple - no detection needed

**Cons:**
- ⚠️ Plays during meetings/presentations
- ⚠️ Ignores user's DND preference

**Use case:** Users who always want to hear Claude notifications

---

### Option 2: **Respect Do Not Disturb**
**When:** No audio when DND/Focus mode is on

**Pros:**
- ✅ Respects user's Focus preferences
- ✅ Silent during meetings
- ✅ Follows macOS conventions

**Cons:**
- ⚠️ Requires DND detection
- ⚠️ Might miss notifications
- ⚠️ More complex implementation

**Use case:** Users who want full DND silence

---

### Option 3: **Hybrid: Visual Silent, Audio Plays**
**When:** Skip visual notification during DND, but play audio

**Pros:**
- ✅ Audio notification still works
- ✅ No popup during meetings (just sound)
- ✅ Good compromise

**Cons:**
- ⚠️ Slightly inconsistent UX
- ⚠️ Still interrupts during DND

**Use case:** Users who want audio alerts but no visual pop-ups

---

### Option 4: **User Configurable** (Best) ⭐ Recommended
**When:** Let users choose in config

Add to `audio-notifier.yaml`:
```yaml
global_settings:
  respect_do_not_disturb: true  # or false
  # true = no audio during DND
  # false = always play audio (current behavior)
```

**Pros:**
- ✅ Users choose their preference
- ✅ Flexible for different workflows
- ✅ Can change based on context

**Cons:**
- ⚠️ Requires DND detection
- ⚠️ More code to maintain

**Use case:** Everyone - let them decide

---

## How to Detect Do Not Disturb

### Method 1: Check Focus Status (macOS 12+)
```bash
# Check if any Focus mode is active
shortcuts run "Get Current Focus"
```

**Pros:** Official API, reliable
**Cons:** Requires Shortcuts app, macOS 12+

---

### Method 2: Check plutil (Legacy)
```bash
# Read DND status from preferences
defaults read ~/Library/Preferences/com.apple.controlcenter.plist NSStatusItem\ Visible\ DoNotDisturb
```

**Pros:** Fast, no dependencies
**Cons:** Unreliable across macOS versions, deprecated

---

### Method 3: Check Notification Center Database
```bash
# Query notification center settings
sqlite3 ~/Library/DoNotDisturb/DB/ModeHistory.db "SELECT * FROM modeHistory ORDER BY startDate DESC LIMIT 1"
```

**Pros:** Accurate historical data
**Cons:** Complex parsing, private API

---

### Method 4: Python Script (Most Reliable) ⭐
```python
#!/usr/bin/env python3
import subprocess
import sys

def is_dnd_enabled():
    try:
        # Use AppleScript to check menu bar
        script = '''
        tell application "System Events"
            tell process "ControlCenter"
                set dndStatus to value of checkbox "Do Not Disturb" of group 1 of window 1
                return dndStatus
            end tell
        end tell
        '''
        result = subprocess.run(['osascript', '-e', script],
                              capture_output=True, text=True, timeout=2)
        return 'true' in result.stdout.lower()
    except:
        return False

if __name__ == '__main__':
    sys.exit(0 if is_dnd_enabled() else 1)
```

**Pros:** Works across macOS versions, reliable
**Cons:** Requires Python (already installed on macOS)

---

## Recommended Implementation

### Step 1: Add Config Option
```yaml
# ~/.claude/audio-notifier.yaml
global_settings:
  respect_do_not_disturb: true  # Default: respect DND
  dnd_detection_method: "shortcuts"  # or "python", "disabled"
```

### Step 2: Update smart-notify.sh

Add DND check before playing audio:

```bash
# Check if we should respect DND
check_do_not_disturb() {
    # Read config setting
    local respect_dnd=$(grep "respect_do_not_disturb:" "$HOME/.claude/audio-notifier.yaml" | awk '{print $2}')

    # Default to false if not set
    if [[ "$respect_dnd" != "true" ]]; then
        return 1  # Don't skip (play audio)
    fi

    # Check if DND is active (using shortcuts - macOS 12+)
    if command -v shortcuts >/dev/null 2>&1; then
        local focus_status=$(shortcuts run "Get Current Focus" 2>/dev/null)
        if [[ -n "$focus_status" && "$focus_status" != "null" ]]; then
            debug_log "Do Not Disturb is active (Focus: $focus_status), skipping audio"
            return 0  # Skip audio
        fi
    fi

    return 1  # Play audio
}

# In send_notification function, before playing audio:
if check_do_not_disturb; then
    debug_log "Skipping audio due to Do Not Disturb"
else
    # Play audio as normal
    osascript -e "do shell script \"afplay '$sound'\"" >/dev/null 2>&1 &
fi
```

### Step 3: Add GUI Toggle

In your config app, add a checkbox:
```javascript
// In Overview section
<label>
  <input type="checkbox" id="respectDND" />
  Silence audio notifications during Do Not Disturb / Focus modes
</label>
```

---

## Complexity vs Benefit Analysis

| Option | Complexity | Benefit | Recommended |
|--------|-----------|---------|-------------|
| Always Play (current) | None | Low | ✅ Good default |
| Respect DND | Medium | High | ⭐ Best for v1.1 |
| User Configurable | Medium-High | Very High | ⭐⭐ Best long-term |

---

## My Recommendation

**Phase 1 (Now):** Keep current behavior (always play)
- Document that audio bypasses DND
- Add to FAQ as expected behavior
- Simple, works for most users

**Phase 2 (v1.1):** Add DND detection + config option
- Add `respect_do_not_disturb` config setting
- Default to `true` (respect DND)
- Give users control
- Takes ~2 hours to implement

---

## FAQ Entry (Add This)

### Does the app respect Do Not Disturb mode?

**Visual notifications:** Yes - they are blocked by Do Not Disturb and Focus modes (standard macOS behavior)

**Audio notifications:** By default, audio plays regardless of Focus mode. This ensures you never miss important Claude Code events.

**Coming soon:** Option to silence audio during Do Not Disturb for users who prefer full Focus mode compliance.

---

## Quick Test (Check Your DND Status)

```bash
# If you have macOS 12+ with Shortcuts:
shortcuts run "Get Current Focus"

# If it returns anything other than empty/null, DND is on
```

This is why you didn't see the visual notification but still heard audio!
