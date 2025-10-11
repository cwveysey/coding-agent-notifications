# Audio Notifications for Claude Code Activity

Get audio notifications when Claude Code asks you questions during your session. Never miss when Claude is waiting for your input!

## 🔊 What This Does

This tool monitors your Claude Code terminal output in real-time and plays a sound notification whenever Claude asks you a question. Perfect for when you're multitasking or working in another window.

**Features:**
- 🎵 Plays a sound (Submarine.aiff) when Claude asks questions
- 🤖 Smart pattern matching to detect conversational questions
- 📝 Logs all detected questions with timestamps
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
# Claude Code question watcher aliases
alias claude-watcher-start='bash ~/.claude/scripts/start-question-watcher.sh'
alias claude-watcher-stop='bash ~/.claude/scripts/stop-question-watcher.sh'
alias claude-watcher-status='bash ~/.claude/scripts/check-watcher-status.sh'
alias claude-watcher-toggle-sound='bash ~/.claude/scripts/toggle-sound.sh'
```

Then reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

### 4. Configure Claude Code Output Logging

The watcher monitors `~/.claude/claude-output.log`. You need to configure Claude Code to write to this file.

Add this to your Claude Code settings (if available) or use shell redirection:

```bash
# Option 1: Redirect output when starting Claude Code
claude | tee -a ~/.claude/claude-output.log

# Option 2: Create an alias
alias claude-watched='claude | tee -a ~/.claude/claude-output.log'
```

**Note:** The exact method depends on your Claude Code setup. The key is ensuring Claude's output gets written to `~/.claude/claude-output.log`.

## 🎯 Usage

### Start the Watcher

```bash
claude-watcher-start
```

This starts the background process that monitors for questions.

### Stop the Watcher

```bash
claude-watcher-stop
```

Stops all running watcher instances.

### Check Status

```bash
claude-watcher-status
```

Shows if the watcher is running and recent activity.

### Toggle Sound On/Off

```bash
claude-watcher-toggle-sound
```

Disable/enable sound notifications while keeping the watcher running. Questions are still logged when sound is disabled.

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
