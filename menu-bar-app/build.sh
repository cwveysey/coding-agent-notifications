#!/bin/bash
# Build script for Claude Sounds Menu Bar app

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FILE="$SCRIPT_DIR/ClaudeSoundsMenuBar.swift"
OUTPUT_APP="$SCRIPT_DIR/ClaudeSoundsMenuBar"

echo "🔨 Building Claude Sounds Menu Bar app..."

# Compile the Swift file
swiftc -O -o "$OUTPUT_APP" "$SOURCE_FILE"

echo "✅ Build complete!"
echo ""
echo "To run the app:"
echo "  $OUTPUT_APP"
echo ""
echo "To run at login, add it to System Settings > General > Login Items"
echo ""
echo "Or run it now:"
echo "  open -a Terminal \"$OUTPUT_APP\" &"
