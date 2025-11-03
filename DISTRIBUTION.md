# Distribution Guide for Coding Agent Notifications

This guide explains how to distribute your Coding Agent Notifications app using both DMG and one-line terminal installation methods.

## Overview

You now have two distribution methods:

1. **DMG Download** - Users download a DMG file and drag the app to Applications
2. **One-Line Terminal Install** - Users run a single curl command to install everything

## Method 1: DMG Distribution

### Building the DMG

1. **Build the app first:**
   ```bash
   cd config-editor-app
   npm run tauri:build
   ```

2. **Create the DMG:**
   ```bash
   ./create-dmg.sh
   ```

   This will create: `dist/Coding-Agent-Notifications-Installer.dmg`

### Distributing the DMG

**Option A: GitHub Releases (Recommended)**

1. Create a new release on GitHub:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Go to GitHub → Releases → Create new release

3. Upload `dist/Coding-Agent-Notifications-Installer.dmg`

4. Users can download with:
   ```
   https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/Coding-Agent-Notifications-Installer.dmg
   ```

**Option B: Direct Hosting**

Upload the DMG to:
- Your personal website
- Dropbox/Google Drive (public link)
- Any file hosting service

### User Installation from DMG

1. Download the DMG file
2. Double-click to mount
3. Drag "Coding Agent Notifications.app" to Applications
4. Launch the app
5. The app will automatically install all components on first launch

## Method 2: One-Line Terminal Installation

### Setting Up Terminal Installation

1. **Host the installation script:**

   **Option A: GitHub (Raw Content)**

   - Push `install-remote.sh` to your GitHub repo
   - The install URL will be:
     ```
     https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/install-remote.sh
     ```

   **Option B: Your Own Server**

   - Upload `install-remote.sh` to your web server
   - Make sure it's accessible via HTTPS
   - URL will be: `https://your-domain.com/install.sh`

2. **Update the script with your repo URL:**

   Edit `install-remote.sh` line 13:
   ```bash
   REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO"
   ```

3. **Test the installation:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/install-remote.sh | bash
   ```

### User Installation via Terminal

Users run one command:
```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/install-remote.sh | bash
```

Or if self-hosted:
```bash
curl -fsSL https://your-domain.com/install.sh | bash
```

## Updating Your Blog Post

Add these installation instructions to your blog post:

```markdown
## Installation

### Option 1: Download the App (Recommended)

1. [Download Coding-Agent-Notifications-Installer.dmg](YOUR_DOWNLOAD_LINK)
2. Open the DMG file
3. Drag the app to your Applications folder
4. Launch the app to complete installation

The app will automatically:
- Install notification scripts
- Configure Claude Code hooks
- Set up default voice files
- Enable visual notifications

### Option 2: One-Line Terminal Install

Run this command in your terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/install-remote.sh | bash
```

This will:
- Download and install all notification scripts
- Configure Claude Code hooks automatically
- Set up default voice files
- Enable notifications

**Note:** After installation, restart any active Claude Code sessions for hooks to take effect.

## Post-Installation

After installation:
1. Restart any active Claude Code sessions
2. Launch the Coding Agent Notifications app to customize settings (GUI method)
3. Or edit `~/.claude/audio-notifier.yaml` directly

## Uninstalling

To uninstall:
```bash
bash ~/.claude/scripts/audio-notifier-uninstall.sh
```
```

## Pre-Distribution Checklist

Before distributing your app:

- [ ] Update `REPO_URL` in `install-remote.sh` with your actual GitHub repo
- [ ] Test the DMG installation on a clean macOS system
- [ ] Test the terminal installation on a clean macOS system
- [ ] Verify hooks are correctly added to Claude Code settings
- [ ] Test that notifications work for all event types
- [ ] Create GitHub release with DMG attached
- [ ] Update blog post with correct download URLs
- [ ] (Optional) Code sign the DMG for distribution
- [ ] (Optional) Notarize with Apple

## Code Signing (Optional but Recommended)

To avoid Gatekeeper warnings:

1. **Get an Apple Developer Account** ($99/year)

2. **Code sign the app:**
   ```bash
   codesign --deep --force --verify --verbose --sign "Developer ID Application: YOUR NAME" \
     "config-editor-app/src-tauri/target/release/bundle/macos/Coding Agent Notifications.app"
   ```

3. **Notarize the DMG:**
   ```bash
   xcrun notarytool submit dist/Coding-Agent-Notifications-Installer.dmg \
     --apple-id "your@email.com" \
     --password "app-specific-password" \
     --team-id "YOUR_TEAM_ID"
   ```

4. **Staple the notarization:**
   ```bash
   xcrun stapler staple dist/Coding-Agent-Notifications-Installer.dmg
   ```

## Troubleshooting

### DMG Installation Issues

**"App is damaged and can't be opened"**
- User needs to run: `xattr -cr "/Applications/Coding Agent Notifications.app"`
- Or code sign your app (see above)

**App doesn't install on first launch**
- Check that `install-from-app.sh` is executable
- Verify resources are bundled in the app

### Terminal Installation Issues

**"curl: (7) Failed to connect"**
- Verify the URL is correct
- Check that the file is publicly accessible
- Test the URL in a browser first

**"jq: command not found"**
- Installation script will auto-install via Homebrew
- If Homebrew isn't installed, user needs to install it first

**Hooks not working after installation**
- User needs to restart Claude Code sessions
- Check that settings.json was updated correctly
- Verify scripts are executable: `chmod +x ~/.claude/scripts/*.sh`

## File Locations After Installation

After installation, users will have:

```
~/.claude/
├── .sounds-enabled
├── audio-notifier.yaml
├── notifications.log
├── settings.json
├── scripts/
│   ├── smart-notify.sh
│   ├── select-sound.sh
│   ├── read-config.sh
│   ├── audio-notifier-uninstall.sh
│   └── ... other scripts
├── voices/
│   └── global/
│       ├── notification.mp3
│       ├── stop.mp3
│       ├── pre_tool_use.mp3
│       ├── post_tool_use.mp3
│       └── subagent_stop.mp3
└── terminal-notifier/
    └── terminal-notifier.app/
```

## Support and Feedback

Direct users to:
- GitHub Issues: YOUR_GITHUB_REPO/issues
- Email: cwveysey@gmail.com
- Documentation: YOUR_DOCS_URL
