# Audio Notifications for Claude Code Activity

Get audio notifications when Claude Code asks you questions during your session. Never miss when Claude is waiting for your input!

## 🔊 What This Does

This tool monitors your Claude Code terminal output in real-time and plays a sound notification whenever Claude asks you a question. Perfect for when you're multitasking or working in another window.

**Features:**
- 🎵 Multiple notification types (audio, visual, remote)
- 🎨 **Per-project sounds** - Different sound for each project (auto-detected)
- 🎲 **Random sound selection** - Consistent sound per project from a pool
- 🎧 **Custom audio support** - Use your own .mp3/.wav/.aiff files
- 🛡️ **Anti-spam protection** - Configurable cooldown between notifications
- ⏱️ **Inactivity detection** - Backup notification if Claude waits too long
- 🤖 Smart pattern matching to detect conversational questions
- 📝 Logs all detected questions with timestamps
- 🔧 YAML configuration file for easy customization
- 🔇 Easy toggle to enable/disable sounds
- 🚀 Runs silently in the background
- 🧹 Simple start/stop management

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

### 3. Add Aliases to Your Shell

Add these to your `~/.zshrc` or `~/.bashrc`:

```bash
# --- Claude Code with logging & audio notifications ---
# Save original claude command
alias claude-silent='command claude'

# Replace claude to always log output (for audio notifications)
claude() {
    if [[ "$CLAUDE_SILENT" == "1" ]]; then
        command claude "$@"
    else
        command claude "$@" 2>&1 | tee -a ~/.claude/claude-output.log
    fi
}

# Watcher controls
alias claude-watcher-start='bash ~/.claude/scripts/start-question-watcher.sh'
alias claude-watcher-stop='bash ~/.claude/scripts/stop-question-watcher.sh'
alias claude-watcher-status='ps aux | grep watch-claude-questions | grep -v grep && echo "✓ Watcher is running" || echo "Watcher is not running"'
alias claude-watcher-toggle-sound='bash ~/.claude/scripts/toggle-sound.sh'
```

Then reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

### 4. Start the Watcher

Start the background watcher (only needs to be done once):

```bash
claude-watcher-start
```

**That's it!** Now every time you run `claude`, output will be logged and you'll hear sounds when Claude asks questions.

## 🎯 Usage

### Normal Usage (Audio Notifications Enabled)

Just run Claude Code normally:

```bash
claude
```

Audio notifications are automatically enabled! You'll hear a sound when Claude asks questions.

### Disable Audio Notifications Temporarily

**Option 1: Run without logging** (no audio notifications for this session):
```bash
claude-silent
```

**Option 2: Use environment variable** (no audio notifications for this session):
```bash
CLAUDE_SILENT=1 claude
```

**Option 3: Toggle sound only** (logging continues, but no sound):
```bash
claude-watcher-toggle-sound
```

### Watcher Controls

**Start the watcher** (run once, keeps running in background):
```bash
claude-watcher-start
```

**Stop the watcher** (disables audio notifications completely):
```bash
claude-watcher-stop
```

**Check watcher status**:
```bash
claude-watcher-status
```

**Toggle sound on/off** (keeps logging, just mutes/unmutes sound):
```bash
claude-watcher-toggle-sound
```

Questions are still logged when sound is disabled.

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
- The watcher only reads Claude Code output
- Questions are logged with timestamps but no other identifying information

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
