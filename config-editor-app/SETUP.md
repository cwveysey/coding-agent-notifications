# Config Editor Setup Guide

## Prerequisites Installation

### 1. Install Node.js (if not already installed)
```bash
# Check if installed
node --version
npm --version

# If not installed, download from: https://nodejs.org/
# Or use Homebrew:
brew install node
```

### 2. Install Rust (if not already installed)
```bash
# Check if installed
rustc --version
cargo --version

# If not installed, run:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Follow the prompts, then restart your terminal
```

### 3. Install Tauri CLI
```bash
# Install the Tauri CLI globally
cargo install tauri-cli

# Or use npm:
npm install -g @tauri-apps/cli
```

## Project Setup

### 4. Install project dependencies
```bash
cd config-editor-app
npm install
```

### 5. Run in development mode
```bash
npm run tauri dev
```

### 6. Build for production
```bash
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`
