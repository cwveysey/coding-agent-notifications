# Audio Notifications for Claude Code Activity

Get audio notifications when Claude Code needs your attention. Never miss when Claude is waiting for your input!

## 🔊 What This Does

This tool uses Claude Code's official hooks system to provide reliable, intelligent notifications. It plays customizable sounds (per-event and per-project) when Claude needs permission, asks questions, or has been idle.

**Features:**
- 🎯 **Hooks-based detection** - Uses official Claude Code Notification and Stop hooks
- 🔔 **Per-event sounds** - Different sounds for permissions, questions, and inactivity
- 🎨 **Per-project sounds** - Different sound for each project (auto-detected)
- 🎲 **Random sound selection** - Consistent sound per project from a pool
- 🎧 **Custom audio support** - Use your own .mp3/.wav/.aiff files
- 🛡️ **Anti-spam protection** - Configurable cooldown between notifications
- ⏱️ **Inactivity detection** - Automatic notification after 60s idle (built into Notification hook)
- 🎵 Multiple notification types (audio, visual, remote)
- 📝 Logs all notifications with timestamps
- 🔧 YAML configuration file for easy customization
- 🔇 Easy toggle to enable/disable sounds
- ✅ No false positives/negatives - relies on Claude's own signals

## 📋 Prerequisites

- macOS (uses macOS system sounds)
- Claude Code CLI installed
- Bash shell (zsh works too)
- `afplay` command (comes with macOS)

## 🚀 Installation

### 1. Clone the Repository

```bash
cd ~/.claude
git clone https://github.com/cwveysey/audio-notifications-for-claude-code-activity.git scripts
```

Or if you already have a scripts directory, clone elsewhere and copy files:

```bash
git clone https://github.com/cwveysey/audio-notifications-for-claude-code-activity.git ~/temp-audio-notif
cp ~/temp-audio-notif/*.sh ~/.claude/scripts/
```

### 2. Make Scripts Executable

```bash
chmod +x ~/.claude/scripts/*.sh
```

### 3. Copy Configuration Files

```bash
# Copy example configs
cp ~/.claude/scripts/audio-notifier.yaml.example ~/.claude/audio-notifier.yaml
cp ~/.claude/scripts/project-sounds.conf.example ~/.claude/project-sounds.conf

# Enable sounds (create flag file)
touch ~/.claude/.sounds-enabled
```

### 4. Configure Claude Code Hooks

Edit `~/.claude/settings.json` and add (or merge with existing hooks):

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/scripts/smart-notify.sh notification"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/scripts/smart-notify.sh stop"
          }
        ]
      }
    ]
  }
}
```

### 5. Add Shell Aliases (Optional)

Add these to your `~/.zshrc` or `~/.bashrc`:

```bash
# Audio notification controls
alias claude-sounds-on='touch ~/.claude/.sounds-enabled && echo "✅ Audio notifications enabled"'
alias claude-sounds-off='rm -f ~/.claude/.sounds-enabled && echo "🔇 Audio notifications disabled"'
alias claude-sounds-status='[[ -f ~/.claude/.sounds-enabled ]] && echo "✅ Enabled" || echo "🔇 Disabled"'
```

Then reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

**That's it!** The next time Claude Code runs, hooks will fire automatically when Claude needs your attention.

## 🎯 Usage

### Normal Usage

Just run Claude Code normally:

```bash
claude
```

You'll automatically get notifications when:
- ✅ **Permission needed** - Claude asks to run a tool (Notification hook)
- ✅ **Question asked** - Claude's response ends with ? (Stop hook)
- ✅ **Idle timeout** - No activity for 60+ seconds (Notification hook)

Each notification:
- 🔊 Plays a project-specific sound
- 📱 Shows visual notification (if terminal-notifier installed)
- 📝 Logs to `~/.claude/notifications.log`

### Disable Audio Notifications

**Temporarily disable sounds:**
```bash
claude-sounds-off
```

**Re-enable sounds:**
```bash
claude-sounds-on
```

**Check status:**
```bash
claude-sounds-status
```

### How It Works

The hooks system automatically fires at key events:

```
Claude needs permission → Notification hook fires → 🔔 Sound plays
Claude finishes response → Stop hook fires → Checks for "?" → 🔔 Sound plays
60 seconds idle → Notification hook fires → 🔔 Sound plays
```

No background processes, no log watching, no pattern matching!

**Note:** If you find cases where you wanted a notification but didn't get one, see the [Alternative Approaches](#-alternative-approaches) section for the pattern-matching approach.

## 🎛️ Configuration

### Configuration File

The tool uses `~/.claude/audio-notifier.yaml` for configuration. Copy the example on first run:

```bash
cp ~/.claude/scripts/audio-notifier.yaml.example ~/.claude/audio-notifier.yaml
```

### Per-Project Sounds 🎨

**Different sounds for different projects!** Helps you instantly know which project needs attention.

**Setup Option 1: Random sounds (automatic)**

In `~/.claude/audio-notifier.yaml`:
```yaml
sound:
  random: true  # Each project gets a consistent random sound
```

The tool automatically:
- Detects your current project from working directory
- Assigns a sound from the available pool
- **Always uses the same sound for the same project**

**Setup Option 2: Custom project mappings**

Edit `~/.claude/project-sounds.conf`:
```bash
# Format: project_name=sound_file
github-activity-summary-tool=/System/Library/Sounds/Hero.aiff
my-portfolio=/System/Library/Sounds/Glass.aiff
work-project=/Users/yourname/Music/work-alert.mp3
```

Project names are matched from your working directory.

### Per-Event Sounds 🎯

**Different sounds for different event types!** Know immediately whether Claude needs permission, is asking a question, or has been idle.

Edit `~/.claude/audio-notifier.yaml`:
```yaml
sound:
  # Per-event sound mappings (override sounds for specific events)
  event_sounds:
    permission: /System/Library/Sounds/Ping.aiff      # When Claude needs permission
    question: /System/Library/Sounds/Glass.aiff       # When Claude asks a question
    inactivity: /System/Library/Sounds/Tink.aiff      # When Claude is idle 60s
```

**Event types:**
- **permission** - Fires when Claude needs permission to use a tool (Read, Write, Bash, etc.)
- **question** - Fires when Claude's response ends with a question mark
- **inactivity** - Fires after 60 seconds of Claude waiting for input

**Priority order:** Event sounds override project sounds and random sounds.

**Examples:**
```yaml
# Use dramatic sounds for permissions, subtle for questions
event_sounds:
  permission: /System/Library/Sounds/Sosumi.aiff
  question: /System/Library/Sounds/Tink.aiff
  inactivity: /System/Library/Sounds/Purr.aiff

# Use custom MP3 files
event_sounds:
  permission: ~/Downloads/alert-urgent.mp3
  question: ~/Music/notification-gentle.mp3
  inactivity: ~/Music/reminder-soft.mp3
```

### Custom Audio Files 🎧

Use your own audio files! Supported formats: `.mp3`, `.wav`, `.aiff`

**As default sound:**
```yaml
sound:
  file: /Users/yourname/Music/my-notification.mp3
```

**In available sounds pool:**
```yaml
sound:
  available_sounds:
    - /System/Library/Sounds/Glass.aiff
    - ~/Downloads/custom-sound.mp3
    - ~/Music/alert.wav
```

**For specific projects:**
```bash
# In project-sounds.conf
my-project=/Users/yourname/Downloads/project-alert.mp3
```

### Anti-Spam Protection 🛡️

Prevents annoying rapid-fire notifications:

```yaml
sound:
  min_interval: 5  # Minimum seconds between notifications
```

**How it works:**
- First question → Sound plays ✅
- Second question 2s later → Skipped (too soon) ❌
- Third question 6s after first → Sound plays ✅

### Inactivity Detection ⏱️

Backup notification if Claude is waiting but no question was detected:

```yaml
inactivity:
  enabled: true
  timeout: 30  # Seconds of no activity before notification
  message: "Claude may be waiting for input"
```

**Use case:** If question detection misses something, you'll still get notified after 30s of inactivity.

### Multiple Notification Types

**Audio (macOS/Linux):**
```yaml
notifications:
  audio:
    enabled: true
```

**Visual (macOS - requires terminal-notifier):**
```yaml
notifications:
  terminal_notifier:
    enabled: true
    title: "Claude Code"
    subtitle: "Question Detected"
```

Install: `brew install terminal-notifier`

**Remote (ntfy.sh - mobile notifications):**
```yaml
notifications:
  ntfy:
    enabled: true
    topic: "my-claude-notifications"
    server: "https://ntfy.sh"
    priority: default
```

Setup: [ntfy.sh](https://ntfy.sh)

## 🎛️ Shell Configuration

### Setup Modes

**Mode 1: Always-On (Recommended)**
- Claude Code always logs output
- Audio notifications enabled by default
- Use `claude-silent` when you want it quiet

```bash
# In ~/.zshrc (already configured if you followed installation)
claude() {
    if [[ "$CLAUDE_SILENT" == "1" ]]; then
        command claude "$@"
    else
        command claude "$@" 2>&1 | tee -a ~/.claude/claude-output.log
    fi
}
```

**Mode 2: Opt-In**
- Claude Code runs normally by default
- Use special command when you want notifications

```bash
# In ~/.zshrc (alternative setup)
alias claude-notify='claude 2>&1 | tee -a ~/.claude/claude-output.log'

# Then use:
claude-notify  # With audio notifications
claude         # Without audio notifications
```

**Mode 3: Manual Wrapper**
- Run with the wrapper script manually

```bash
bash ~/.claude/scripts/claude-with-logging.sh
```

### When to Use Each Option

| Situation | Command | Effect |
|-----------|---------|--------|
| Normal work with notifications | `claude` | ✅ Logging + Sound |
| Need quiet (calls, recording) | `claude-silent` | ❌ No logging, no sound |
| Need quiet but keep logs | `CLAUDE_SILENT=1 claude` | ❌ No logging, no sound |
| Mute sound, keep logging | `claude-watcher-toggle-sound` then `claude` | ✅ Logging, ❌ No sound |
| Stop watcher completely | `claude-watcher-stop` then `claude` | ✅ Logging, ❌ No sound |

## 📁 File Structure

```
~/.claude/
├── scripts/
│   ├── watch-claude-questions.sh      # Main watcher script
│   ├── start-question-watcher.sh      # Start daemon
│   ├── stop-question-watcher.sh       # Stop daemon
│   ├── check-watcher-status.sh        # Status checker
│   └── toggle-sound.sh                # Toggle sound on/off
├── claude-output.log                  # Claude Code output (monitored)
├── questions-detected.log             # Detected questions log
├── watcher-output.log                 # Watcher debug log
├── watcher.pid                        # PID of running watcher
└── .sounds-enabled                    # Sound toggle flag
```

## 🔧 How It Works

1. **Terminal Logging**: Claude Code output is written to `~/.claude/claude-output.log`
2. **Watcher Process**: `watch-claude-questions.sh` uses `tail -f` to follow new lines in real-time
3. **Pattern Matching**: Detects questions using regex:
   - Ends with `?`
   - Starts with question words (what, when, where, why, how, would, should, can, could, etc.)
   - Minimum 15 characters
   - Filters out command prompts and URLs
4. **Sound Playback**: Plays `/System/Library/Sounds/Submarine.aiff` using `afplay`
5. **Logging**: All detected questions are logged to `questions-detected.log`

## 🎨 Customization

### Change the Sound

Edit `watch-claude-questions.sh` line that contains:

```bash
SOUND_FILE="/System/Library/Sounds/Submarine.aiff"
```

Available macOS system sounds:
- `/System/Library/Sounds/Submarine.aiff` (default)
- `/System/Library/Sounds/Ping.aiff`
- `/System/Library/Sounds/Glass.aiff`
- `/System/Library/Sounds/Blow.aiff`
- `/System/Library/Sounds/Funk.aiff`

Or use your own audio file (`.aiff`, `.wav`, `.mp3`).

### Adjust Question Detection

Edit the pattern matching in `watch-claude-questions.sh`:

```bash
# Change minimum question length (default: 15)
MIN_LENGTH=15

# Modify question word patterns
if [[ "$line" =~ (what|when|where|why|how|would|should|can|could|do|does|did|is|are|were|was) ]]; then
```

### Change Log File Location

Update the `OUTPUT_LOG` variable in `watch-claude-questions.sh`:

```bash
OUTPUT_LOG="$HOME/.claude/claude-output.log"
```

Make sure Claude Code writes to the same location.

## 🐛 Troubleshooting

### No sound playing

1. **Check if watcher is running:**
   ```bash
   claude-watcher-status
   ```

2. **Check if sounds are enabled:**
   ```bash
   ls ~/.claude/.sounds-enabled
   # If file doesn't exist, sounds are disabled
   ```

3. **Test sound manually:**
   ```bash
   afplay /System/Library/Sounds/Submarine.aiff
   ```

4. **Check watcher logs:**
   ```bash
   tail -f ~/.claude/watcher-output.log
   ```

### Multiple sounds playing

If you hear duplicate sounds, multiple watcher instances may be running:

```bash
# Stop all instances
claude-watcher-stop

# Wait a moment
sleep 2

# Start fresh
claude-watcher-start

# Verify only one instance
ps aux | grep watch-claude-questions | grep -v grep
```

### Questions not being detected

1. **Verify output is being logged:**
   ```bash
   tail -f ~/.claude/claude-output.log
   ```

   If empty, Claude Code output isn't being captured.

2. **Test manually:**
   ```bash
   echo "Would you like to test the system?" >> ~/.claude/claude-output.log
   ```

   You should hear a sound and see the question logged.

3. **Check pattern matching:**
   Look at `questions-detected.log` to see what's being detected:
   ```bash
   tail ~/.claude/questions-detected.log
   ```

### Watcher won't start

1. **Check for stale processes:**
   ```bash
   ps aux | grep watch-claude-questions
   ```

2. **Manually kill if needed:**
   ```bash
   pkill -f "watch-claude-questions.sh"
   ```

3. **Clean up PID file:**
   ```bash
   rm -f ~/.claude/watcher.pid
   ```

4. **Try starting again:**
   ```bash
   claude-watcher-start
   ```

## 🔒 Privacy & Security

- All logs are stored locally in `~/.claude/`
- No data is sent to external services
- Hooks only process Claude Code's structured JSON data
- Notifications are logged with timestamps but no other identifying information

---

## 🔄 Alternative Approaches

The hooks-only approach (recommended above) should cover most notification needs. However, if you find cases where you wanted a notification but didn't get one, consider the pattern-matching approach.

### Pattern-Matching Log Watcher (watch-claude-questions.sh)

This alternative approach watches terminal output in real-time and uses regex patterns to detect questions.

**When to consider this:**
- You've tested hooks and found missing notifications
- You need to catch specific phrasings not detected by hooks
- You want verbose logging for debugging
- You're researching different notification approaches

**Setup:**
1. Configure your shell to log Claude output:
   ```bash
   # Add to ~/.zshrc
   claude() {
       command claude "$@" 2>&1 | tee -a ~/.claude/claude-output.log
   }
   ```

2. Start the watcher:
   ```bash
   bash ~/.claude/scripts/start-question-watcher.sh
   ```

3. Stop when done:
   ```bash
   bash ~/.claude/scripts/stop-question-watcher.sh
   ```

**Trade-offs:**
- ✅ Real-time pattern detection
- ✅ Detailed logging for debugging
- ❌ High false positive rate (matches code, URLs)
- ❌ High false negative rate (misses unconventional questions)
- ❌ Requires maintenance (regex patterns)
- ❌ May duplicate notifications from hooks

**Recommendation:** Try hooks-only first. Only add pattern matching if you identify specific gaps in notification coverage after real-world testing.

See the header comment in `watch-claude-questions.sh` for full documentation of this approach.

---

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share your customizations

## 📄 License

MIT License - feel free to use and modify as needed.

## 🙏 Acknowledgments

Built for the Claude Code community to enhance the interactive coding experience.

## 📬 Support

If you encounter issues:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the watcher logs: `~/.claude/watcher-output.log`
3. Open an issue on GitHub with:
   - Your macOS version
   - Shell type (zsh/bash)
   - Error messages from logs
   - Steps to reproduce

---

**Made with ❤️ for Claude Code users**
