# Audio Notifications for Claude Code Activity

Smart audio and visual notifications for [Claude Code](https://claude.com/claude-code) - never miss when Claude needs your attention.

## Features

### 🔔 Smart Notifications
- **Permission Requests** - Get notified when Claude needs permission to run commands
- **Questions** - Hear when Claude asks you a question
- **Inactivity Detection** - Alert when Claude has been idle for 60+ seconds
- **Tool Descriptions** - See exactly what Claude wants to do (not just "needs permission for Bash")

### 🎨 macOS Menu Bar App
- Beautiful native Swift app that lives in your menu bar
- Custom bell icon with "C" for Claude
- One-click toggle for enabling/disabling sounds
- GUI controls for selecting sounds for each event type
- Sound preview before selecting
- Quick access to config file and debug logs

### 🎵 Customizable Sounds
- Per-event sound selection (Permission, Question, Inactivity)
- Per-project sound mappings
- Random sound mode (different sound per project)
- Support for system sounds and custom audio files

### 🛡️ Smart Features
- **Anti-spam protection** - Configurable cooldown between notifications
- **Hook-based** - Uses Claude Code's official notification hooks (reliable)
- **Transcript parsing** - Extracts detailed context from Claude's session
- **Debug logging** - Full transparency for troubleshooting

## Installation

### Quick Install

```bash
cd /tmp
git clone https://github.com/cwveysey/audio-notifications-for-claude-code-activity.git
cd audio-notifications-for-claude-code-activity
./install.sh
```

### Manual Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cwveysey/audio-notifications-for-claude-code-activity.git
   cd audio-notifications-for-claude-code-activity
   ```

2. **Copy scripts to ~/.claude/**
   ```bash
   cp -r scripts/* ~/.claude/scripts/
   chmod +x ~/.claude/scripts/*.sh
   ```

3. **Copy and configure audio-notifier.yaml**
   ```bash
   cp config/audio-notifier.yaml.example ~/.claude/audio-notifier.yaml
   # Edit ~/.claude/audio-notifier.yaml to customize settings
   ```

4. **Set up Claude Code hooks**

   Edit your `~/.config/claude/settings.json` (or wherever your Claude Code settings are) and add:

   ```json
   {
     "hooks": {
       "Notification": [
         {
           "type": "command",
           "command": "bash ~/.claude/scripts/smart-notify.sh notification"
         }
       ],
       "Stop": [
         {
           "type": "command",
           "command": "bash ~/.claude/scripts/smart-notify.sh stop"
         }
       ]
     }
   }
   ```

5. **Enable sounds**
   ```bash
   touch ~/.claude/.sounds-enabled
   ```

6. **Build and run the menu bar app** (optional but recommended)
   ```bash
   cd menu-bar-app
   ./build.sh
   # Then run:
   ./ClaudeSoundsMenuBar &
   # Or add to Login Items in System Settings
   ```

## Usage

### Menu Bar App

Once the menu bar app is running, click the bell icon to:

- **Toggle sounds on/off** - Click "Enabled" to toggle (shows checkmark when on)
- **Select event sounds** - Choose sounds for Permission, Question, and Inactivity
- **Preview sounds** - Click any sound to hear it before selecting
- **Open config file** - Quick access to advanced settings
- **View debug log** - Troubleshoot notification issues

### Command Line

```bash
# Enable sounds
touch ~/.claude/.sounds-enabled

# Disable sounds
rm ~/.claude/.sounds-enabled

# Check status
ls ~/.claude/.sounds-enabled && echo "Enabled" || echo "Disabled"
```

Or if you've set up the zsh aliases:

```bash
claude-sounds-on       # Enable sounds
claude-sounds-off      # Disable sounds
claude-sounds-status   # Check current status
```

## Configuration

### Audio Notifier Config

Edit `~/.claude/audio-notifier.yaml` to customize:

- **Event sounds** - Different sounds for permission, question, inactivity
- **Project sounds** - Per-project sound mappings
- **Random mode** - Auto-assign sounds based on project
- **Anti-spam settings** - Minimum interval between notifications
- **Custom messages** - Notification text per event type
- **Debug logging** - Enable verbose output

See `config/audio-notifier.yaml.example` for full documentation.

### Project-Specific Sounds

Edit `~/.claude/project-sounds.conf` to map project names to sounds:

```bash
github-activity-summary-tool=/System/Library/Sounds/Hero.aiff
my-portfolio=/System/Library/Sounds/Glass.aiff
```

## Project Structure

```
audio-notifications-for-claude-code-activity/
├── scripts/               # Bash scripts for notifications
│   ├── smart-notify.sh    # Main notification handler (for hooks)
│   ├── select-sound.sh    # Sound selection logic
│   ├── toggle-sounds.sh   # Enable/disable sounds
│   └── ...
├── menu-bar-app/          # macOS menu bar application
│   ├── ClaudeSoundsMenuBar.swift
│   ├── build.sh
│   └── README.md
├── config/                # Configuration files
│   └── audio-notifier.yaml.example
├── docs/                  # Additional documentation
├── install.sh             # Installation script
└── README.md              # This file
```

## How It Works

### Notification Flow

1. **Hook Triggered** - Claude Code fires `Notification` or `Stop` hook
2. **smart-notify.sh** - Receives hook data (message, transcript path, etc.)
3. **Transcript Parsing** - Extracts tool description or question text
4. **Sound Selection** - Chooses sound based on event type and project
5. **Notification** - Plays audio + shows visual notification (if terminal-notifier installed)

### Hook Types

- **Notification Hook** - Fires when:
  - Claude needs permission to use a tool
  - Claude has been idle for 60+ seconds

- **Stop Hook** - Fires when:
  - Claude finishes a response
  - Used to detect questions (looks for `?` at end)

## Troubleshooting

### No sound playing

1. Check if sounds are enabled:
   ```bash
   ls ~/.claude/.sounds-enabled
   ```

2. Check debug log:
   ```bash
   tail -f ~/.claude/smart-notify-debug.log
   ```

3. Enable debug mode:
   ```bash
   DEBUG=true bash ~/.claude/scripts/smart-notify.sh notification
   ```

### Multiple notifications

Check for duplicate watch processes:

```bash
ps aux | grep "watch-claude" | grep -v grep
```

Kill duplicates:

```bash
pkill -f "watch-claude-questions.sh"
```

### Menu bar app not showing

Make sure it's running:

```bash
ps aux | grep ClaudeSoundsMenuBar | grep -v grep
```

Rebuild if needed:

```bash
cd menu-bar-app && ./build.sh
```

## Requirements

- macOS (for menu bar app)
- Bash 4.0+
- jq (JSON processing)
- Claude Code with hooks support
- Optional: terminal-notifier (for visual notifications)
- Optional: Swift compiler (for building menu bar app)

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

Built with [Claude Code](https://claude.com/claude-code) by [@cwveysey](https://github.com/cwveysey)

## Related Projects

- [GitHub Activity Summary Tool](https://github.com/cwveysey/github-activity-summary-tool) - Daily email summaries of your GitHub activity with AI-generated blog post and tweet suggestions

---

**Never miss when Claude needs you again! 🔔**
