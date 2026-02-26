# Contributing

Thanks for your interest in contributing to Coding Agent Notifications!

## Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes
4. Test on macOS (this is a macOS-only project)
5. Commit with a clear message
6. Push and open a pull request

## Development Setup

### Notification Scripts

The bash scripts in `scripts/` are the core of the project. Test changes by running:

```bash
DEBUG=true bash scripts/smart-notify.sh notification
```

### Menu Bar App (Swift)

```bash
cd menu-bar-app
./build.sh
```

### Config Editor App (Tauri)

```bash
cd config-editor-app
npm install
npm run tauri:dev
```

## Guidelines

- This is a macOS-only project. Changes should work on macOS 13+.
- Keep bash scripts POSIX-compatible where possible (except where bash 4+ features are needed).
- Test with both the menu bar app and CLI workflows.
- If adding a new notification event type, update the example config file too.

## Bug Reports

Open an issue with:

- macOS version
- Claude Code version
- Contents of `~/.claude/smart-notify-debug.log` (if relevant)
- Steps to reproduce

## Questions?

Open a discussion or issue.
