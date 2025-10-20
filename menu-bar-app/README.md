# Claude Code Notifier - Menu Bar App

A lightweight macOS menu bar application to control Claude Code notifications.

## Features

- 🎨 Custom icon: Bell + "C" for Claude (white, adapts to light/dark mode)
- 🔔 Quick toggle for enabling/disabling sounds
- 🎵 GUI controls for event sounds (Permission, Response Complete, Inactivity)
- 🔊 Sound preview - hear sounds before selecting
- 📊 Visual status indicator (bell icon when enabled, bell with slash when disabled)
- 📝 Quick access to config file and debug logs
- 🚀 Lightweight native Swift app

## Installation

### 1. Build the app

```bash
cd ~/.claude/menu-bar-app
./build.sh
```

**Note:** The first build may take 1-2 minutes as Swift compiles the standard library. Subsequent builds will be much faster.

### 2. Run the app

```bash
~/.claude/menu-bar-app/ClaudeSoundsMenuBar &
```

### 3. (Optional) Run at login

Add the app to **System Settings > General > Login Items** to start automatically when you log in.

Alternatively, create a launch agent:

```bash
# Create launch agent directory if it doesn't exist
mkdir -p ~/Library/LaunchAgents

# Create launch agent plist
cat > ~/Library/LaunchAgents/com.claude.sounds-menu-bar.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.sounds-menu-bar</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/YOUR_USERNAME/.claude/menu-bar-app/ClaudeSoundsMenuBar</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Update YOUR_USERNAME in the plist
sed -i '' "s|/Users/YOUR_USERNAME|$HOME|g" ~/Library/LaunchAgents/com.claude.sounds-menu-bar.plist

# Load the launch agent
launchctl load ~/Library/LaunchAgents/com.claude.sounds-menu-bar.plist
```

## Usage

Once running, you'll see a custom bell icon in your menu bar with a small "C" for Claude.

**Icon states:**
- Bell (clear) = Sounds enabled
- Bell with slash = Sounds disabled

**Menu options:**
- **🔔/🔕 Enabled/Disabled** - Click to toggle sounds on/off
- **Event Sounds** - Configure sounds for each event type:
  - Permission Sound - Plays when Claude needs your permission
  - Response Complete Sound - Plays when Claude finishes responding
  - Inactivity Sound - Plays when Claude is idle for 60s
  - Click any sound to hear a preview before selecting
- **Open Config File** - Edit advanced settings in your text editor
- **View debug log** - Troubleshoot notification issues
- **Quit** - Close the app

## Uninstall

To stop and remove the app:

```bash
# If using launch agent
launchctl unload ~/Library/LaunchAgents/com.claude.sounds-menu-bar.plist
rm ~/Library/LaunchAgents/com.claude.sounds-menu-bar.plist

# Remove the app
rm -rf ~/.claude/menu-bar-app
```

## How it works

The app reads and writes the `~/.claude/.sounds-enabled` flag file, which is used by the Claude notification system to determine whether to play sounds.
