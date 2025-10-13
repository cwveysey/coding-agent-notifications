#!/bin/bash
# Safe dev server launcher - kills old processes first

echo "🧹 Cleaning up any existing dev processes..."

# Kill any existing tauri/vite/cargo processes
pkill -9 -f "tauri dev" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "cargo run.*audio-notifier" 2>/dev/null || true

# Wait a moment for processes to die
sleep 1

echo "✅ Cleanup complete"
echo ""
echo "🚀 Starting dev server..."
echo ""

# Source Cargo environment
source "$HOME/.cargo/env"

# Start fresh
npm run tauri:dev
