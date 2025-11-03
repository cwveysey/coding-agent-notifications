# Quick Start Guide - Distribution Setup

## What's Been Created

You now have **two complete distribution methods** for your Coding Agent Notifications app:

### 1. DMG Download (GUI Installation)
- **Script:** `create-dmg.sh`
- **Output:** `dist/Coding-Agent-Notifications-Installer.dmg`
- **Best for:** Users who prefer GUI apps and traditional Mac installation

### 2. One-Line Terminal Install
- **Script:** `install-remote.sh`
- **Usage:** `curl -fsSL URL | bash`
- **Best for:** Developers who prefer terminal-based installation

## Getting Started

### Step 1: Build the DMG

```bash
# Install create-dmg (one-time only)
brew install create-dmg

# Create the DMG
./create-dmg.sh
```

This creates: `dist/Coding-Agent-Notifications-Installer.dmg`

### Step 2: Set Up Terminal Installation

1. **Update the repo URL in `install-remote.sh`:**
   ```bash
   # Edit line 13
   REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO"
   ```

2. **Push to GitHub:**
   ```bash
   git add install-remote.sh
   git commit -m "Add remote installer"
   git push
   ```

3. **Your install command will be:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/install-remote.sh | bash
   ```

### Step 3: Create GitHub Release

```bash
# Tag your release
git tag v1.0.0
git push origin v1.0.0

# Then on GitHub:
# 1. Go to Releases → New Release
# 2. Upload dist/Coding-Agent-Notifications-Installer.dmg
# 3. Publish
```

### Step 4: Update Your Blog Post

Replace the installation section with:

````markdown
## Installation

### Option 1: Download the App (Recommended)

[Download Coding-Agent-Notifications-Installer.dmg](https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/Coding-Agent-Notifications-Installer.dmg)

1. Open the downloaded DMG
2. Drag the app to Applications
3. Launch the app - installation happens automatically
4. Restart any active Claude Code sessions

### Option 2: One-Line Terminal Install

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/install-remote.sh | bash
```

Then restart any active Claude Code sessions.

## Uninstalling

```bash
bash ~/.claude/scripts/audio-notifier-uninstall.sh
```
````

## Testing

Before releasing, test both methods:

### Test DMG Installation

```bash
# 1. Build the DMG
./create-dmg.sh

# 2. Mount and test
open dist/Coding-Agent-Notifications-Installer.dmg
# Drag app to Applications
# Launch and verify installation
```

### Test Terminal Installation

```bash
# Test the remote installer (after pushing to GitHub)
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/install-remote.sh | bash

# Verify installation
ls -la ~/.claude/scripts/
ls -la ~/.claude/voices/global/
cat ~/.claude/settings.json
```

## What Each Method Installs

Both methods install the same components:

```
~/.claude/
├── .sounds-enabled                  # Enable flag
├── audio-notifier.yaml              # Configuration
├── settings.json                    # Claude Code settings (updated with hooks)
├── scripts/                         # Notification scripts
│   ├── smart-notify.sh
│   ├── select-sound.sh
│   ├── read-config.sh
│   └── audio-notifier-uninstall.sh
├── voices/global/                   # Voice files
│   ├── notification.mp3
│   ├── stop.mp3
│   ├── pre_tool_use.mp3
│   ├── post_tool_use.mp3
│   └── subagent_stop.mp3
└── terminal-notifier/               # Visual notification utility
    └── terminal-notifier.app
```

## Hooks Configuration

Both methods automatically configure these Claude Code hooks:

- **Notification** - Claude sends a notification
- **Stop** - Claude finishes responding
- **PreToolUse** - Before tool calls (permission prompts)
- **PostToolUse** - After tool calls complete
- **SubagentStop** - When subagent tasks finish

## File Manifest

### Created Scripts

1. **`create-dmg.sh`** - Creates distributable DMG
2. **`install-remote.sh`** - Remote installer for terminal installation
3. **`config-editor-app/install-from-app.sh`** - Called by the GUI app on first launch
4. **`DISTRIBUTION.md`** - Complete distribution guide
5. **`QUICK-START.md`** - This file

### Existing App Structure

```
config-editor-app/
└── src-tauri/
    └── target/
        └── release/
            └── bundle/
                └── macos/
                    └── Coding Agent Notifications.app/
                        └── Contents/
                            └── Resources/
                                └── resources/
                                    ├── scripts/
                                    ├── voices/
                                    └── terminal-notifier/
```

## Common Issues

### "App is damaged and can't be opened"

Users need to run:
```bash
xattr -cr "/Applications/Coding Agent Notifications.app"
```

**Solution:** Code sign your app (requires Apple Developer account)

### Hooks not working

**Solution:** User needs to restart Claude Code sessions after installation

### Visual notifications not showing

**Solution:** Check terminal-notifier is installed:
```bash
~/.claude/terminal-notifier/terminal-notifier.app/Contents/MacOS/terminal-notifier \
  -title "Test" -message "Testing"
```

## Next Steps

1. ✅ Build the DMG: `./create-dmg.sh`
2. ✅ Update repo URL in `install-remote.sh`
3. ✅ Test both installation methods
4. ✅ Create GitHub release with DMG
5. ✅ Update blog post with installation instructions
6. ✅ (Optional) Code sign for smoother installation
7. ✅ (Optional) Notarize with Apple

## Support

For detailed information, see `DISTRIBUTION.md`

For questions:
- Email: cwveysey@gmail.com
- GitHub Issues: YOUR_REPO/issues
