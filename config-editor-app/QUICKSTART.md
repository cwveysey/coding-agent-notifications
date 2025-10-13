# Quick Start Guide

## Setup Icon & Run

```bash
# 1. Setup the icon
chmod +x setup-icon.sh
./setup-icon.sh

# 2. Install dependencies (if not already done)
npm install

# 3. Run the app (safe mode - auto-cleanup)
chmod +x dev.sh
./dev.sh

# Or directly:
npm run start
```

**First run takes 5-10 minutes to compile Rust dependencies.**

## What This App Does

A GUI editor for `~/.claude/audio-notifier.yaml` configuration file. Provides forms for:
- Sound settings (event sounds, project mappings, random mode)
- Detection settings (question patterns, min length)
- Notification types (audio, visual, remote)
- Inactivity detection
- Debug logging

## Build for Production

```bash
npm run tauri:build
```

App will be in `src-tauri/target/release/bundle/macos/`

## Credits

Icon: [Radio icons by Freepik - Flaticon](https://www.flaticon.com/free-icons/radio)
