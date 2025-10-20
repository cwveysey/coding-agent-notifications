# Claude Code audio notifications

A beautiful, native macOS application for editing the `audio-notifier.yaml` configuration file with an intuitive GUI interface.

## Features

- 🎨 **Modern UI** - TalkTastic-inspired design with native macOS feel
- 🎵 **Sound Management** - Easy selection and preview of notification sounds
- 🔍 **All Settings** - Access all configuration options in one place
- ⚡ **Fast & Lightweight** - Built with Tauri (< 10 MB app size)
- 💾 **Safe Editing** - Validates configuration before saving

## Installation

### Prerequisites

1. **Node.js** (v18 or higher)
   ```bash
   brew install node
   ```

2. **Rust** (latest stable)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

### Setup

1. Setup the app icon:
   ```bash
   cd config-editor-app
   chmod +x setup-icon.sh
   ./setup-icon.sh
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   chmod +x dev.sh
   ./dev.sh
   ```

   Or use: `npm run start`

   **Note:** First run takes 5-10 minutes to compile Rust dependencies. The `dev.sh` script automatically cleans up old processes to prevent duplicate output.

4. Build for production:
   ```bash
   npm run tauri:build
   ```

The built application will be in `src-tauri/target/release/bundle/macos/`

## Usage

### Navigation

Use the sidebar to navigate between configuration sections:

- **Sound settings** - Configure default sounds, random mode, event sounds, and project mappings
- **Notifications** - Configure audio, visual, and remote notifications
- **Inactivity** - Set up idle detection and timeouts
- **Logging** - Manage debug logs and notification logging

### Sound Preview

Click the ▶️ button next to any sound selector to preview the sound before saving.

### Project Mappings

Add custom sound mappings for specific projects:
1. Click "+ Add Project Mapping"
2. Enter the project name
3. Select the sound from the dropdown

### Saving Changes

Click "Save Configuration" in the top-right to write changes to `~/.claude/audio-notifier.yaml`

### Reset to Defaults

Click "Reset to Defaults" in the sidebar footer to restore all settings to their default values.

## Configuration File Location

The app reads and writes to: `~/.claude/audio-notifier.yaml`

## Development

### Project Structure

```
config-editor-app/
├── index.html          # Main HTML
├── main.js             # Frontend JavaScript
├── styles.css          # Styling
├── vite.config.js      # Vite build config
├── package.json        # Node dependencies
└── src-tauri/          # Rust backend
    ├── Cargo.toml      # Rust dependencies
    ├── tauri.conf.json # Tauri config
    └── src/
        └── main.rs     # Rust backend code
```

### Technology Stack

- **Frontend**: Vanilla JavaScript + Vite
- **Backend**: Rust + serde_yaml
- **Framework**: Tauri 2.0
- **Styling**: Custom CSS (TalkTastic-inspired)

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Make sure Rust is installed and up to date:
   ```bash
   rustup update
   ```

2. Clean and rebuild:
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   npm run tauri:build
   ```

### Config Not Loading

If the configuration doesn't load:

1. Check that `~/.claude/audio-notifier.yaml` exists
2. Verify the YAML syntax is valid
3. Check the debug console for errors

## Credits

App icon: [Radio icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/radio)

## License

MIT License - see parent project LICENSE for details
