# Next Steps

## Immediate Actions (Required to Build)

### 1. Install Prerequisites ⚠️ REQUIRED

**Node.js:**
```bash
# Check if installed
node --version

# If not, install
brew install node
```

**Rust:**
```bash
# Check if installed
rustc --version

# If not, install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. Install Dependencies ⚠️ REQUIRED

```bash
cd config-editor-app
npm install
```

### 3. Create App Icons (Optional but Recommended)

The app will build without icons, but won't look professional. Quick option:

```bash
cd src-tauri/icons
# Download any 512x512 PNG and save as icon.png
# Or create one using:
# - SF Symbols app
# - Figma
# - Online icon generator
```

### 4. First Test Run

```bash
npm run tauri:dev
```

**Expected behavior:**
- First run takes 5-10 minutes (Rust compiles all dependencies)
- Window opens with the config editor
- You can navigate between sections
- Clicking "Load Configuration" reads from `~/.claude/audio-notifier.yaml`
- Sound preview buttons work
- Save button writes back to the config file

## Testing Checklist

### Basic Functionality
- [ ] App launches without errors
- [ ] All 5 navigation sections load
- [ ] Config loads from `~/.claude/audio-notifier.yaml`
- [ ] Sound preview buttons play sounds
- [ ] Changes persist after saving
- [ ] Reset to defaults works
- [ ] Form validation works (try invalid values)

### Sound settings
- [ ] Toggle sound enabled/disabled
- [ ] Change default sound
- [ ] Toggle random mode
- [ ] Add/remove sounds from pool
- [ ] Preview each sound type
- [ ] Add project mapping
- [ ] Remove project mapping
- [ ] Change event sounds

### Notifications
- [ ] Toggle audio notifications
- [ ] Toggle terminal notifications
- [ ] Edit notification title/subtitle
- [ ] Edit custom messages

### Inactivity
- [ ] Toggle inactivity detection
- [ ] Adjust timeout value
- [ ] Edit inactivity message

### Logging
- [ ] Toggle notification logging
- [ ] Toggle debug mode
- [ ] Edit log file paths
- [ ] Click "View log file" button
- [ ] Click "View debug log" button

## Building for Production

### First Production Build

```bash
npm run tauri:build
```

**Expected output:**
```
src-tauri/target/release/bundle/macos/Audio Notifier Config.app
```

### Install the App

```bash
cp -r "src-tauri/target/release/bundle/macos/Audio Notifier Config.app" /Applications/
```

Or drag to Applications folder in Finder.

### Verify Installation

1. Open Spotlight (⌘ + Space)
2. Type "Audio Notifier Config"
3. App should launch
4. Make a config change
5. Verify it saves to `~/.claude/audio-notifier.yaml`

## Integration with Existing Project

### Option 1: Standalone App

Keep as separate app users launch manually. Simple but requires separate updates.

### Option 2: Launch from Menu Bar

Add menu item to existing menu bar app:

```swift
// In ClaudeSoundsMenuBar.swift
menu.addItem(NSMenuItem(title: "Open Settings...",
                       action: #selector(openConfigEditor),
                       keyEquivalent: "s"))

@objc func openConfigEditor() {
    let appPath = "/Applications/Audio Notifier Config.app"
    NSWorkspace.shared.open(URL(fileURLWithPath: appPath))
}
```

### Option 3: Merge Codebases

Combine menu bar app and config editor into one app with two windows. More complex but better UX.

## Distribution Options

### Option 1: GitHub Releases
- Build the app
- Create release on GitHub
- Attach `.dmg` or `.app.zip`
- Users download and install manually

### Option 2: Homebrew Cask
- Create a Homebrew cask formula
- Users install with `brew install --cask audio-notifier-config`

### Option 3: Mac App Store
- Requires Apple Developer account ($99/year)
- More exposure but more restrictions
- Requires code signing and notarization

## Recommended Enhancements

### Quick Wins (< 1 hour each)
1. Add tooltips to all form fields
2. Add keyboard shortcuts (⌘S to save, ⌘R to reset)
3. Add "Copy to clipboard" for config path
4. Add "Reveal in Finder" for config file
5. Add success/error toast notifications

### Medium Effort (2-4 hours each)
1. Add file picker for custom sounds
2. Add config validation with error highlights
3. Add dark mode support
4. Add preset templates
5. Add export config to file

### Larger Projects (1+ days)
1. Add sound waveform visualization
2. Add undo/redo functionality
3. Add config diff viewer
4. Add real-time sound preview
5. Add multiple config profiles

## Troubleshooting Guide

### Build Fails with "cargo not found"
```bash
source $HOME/.cargo/env
```

### Port 5173 already in use
```bash
# Kill the process using port 5173
lsof -ti:5173 | xargs kill -9

# Or change port in vite.config.js
```

### "Unable to load config"
```bash
# Check if config exists
ls -la ~/.claude/audio-notifier.yaml

# If not, create from example
cp config/audio-notifier.yaml.example ~/.claude/audio-notifier.yaml
```

### App icon is blank
You need to add icons to `src-tauri/icons/`. See `src-tauri/icons/README.md`.

### Changes don't persist
Check file permissions:
```bash
ls -la ~/.claude/
# Should be writable by your user
```

## Getting Help

- **Documentation**: See README.md, QUICKSTART.md, SETUP.md
- **Tauri Docs**: https://tauri.app/v2/
- **GitHub Issues**: Report bugs in the project repo
- **Rust Errors**: Check Cargo.toml dependencies are correct
- **JavaScript Errors**: Check browser DevTools console

## Success Criteria

You'll know it's working when:
1. ✅ App builds without errors
2. ✅ You can load the existing config
3. ✅ You can make changes in the UI
4. ✅ Changes save to `~/.claude/audio-notifier.yaml`
5. ✅ Sound previews work
6. ✅ The saved config works with your existing notification system

## Final Checklist

Before considering this complete:
- [ ] App builds and runs
- [ ] All sections load correctly
- [ ] Can load existing config
- [ ] Can save changes
- [ ] Sound previews work
- [ ] Config validates correctly
- [ ] No console errors
- [ ] Production build succeeds
- [ ] Installed app works
- [ ] Integrated with existing project (if desired)

## Questions to Consider

1. **Distribution**: How will users get this app?
2. **Updates**: How will you ship updates?
3. **Integration**: Launch separately or from menu bar?
4. **Icons**: Custom icons or use default?
5. **Features**: Which enhancements are must-haves?

---

**Ready to get started?**

Run:
```bash
cd config-editor-app
chmod +x build-and-run.sh
./build-and-run.sh
```

Good luck! 🚀
