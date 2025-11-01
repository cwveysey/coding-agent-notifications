#!/bin/bash
# Script to create a DMG installer for Coding Agent Notifications
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Creating DMG for Coding Agent Notifications       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
APP_NAME="Coding agent notifications"
APP_PATH="config-editor-app/src-tauri/target/release/bundle/macos/${APP_NAME}.app"
DMG_NAME="Coding-Agent-Notifications-Installer"
OUTPUT_DIR="dist"
VERSION="1.0.0"

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}❌ Error: App not found at $APP_PATH${NC}"
    echo "Please build the app first with: cd config-editor-app && npm run tauri:build"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if create-dmg is installed
if ! command -v create-dmg &> /dev/null; then
    echo -e "${YELLOW}⚠️  create-dmg not found. Installing via Homebrew...${NC}"
    if command -v brew &> /dev/null; then
        brew install create-dmg
    else
        echo -e "${RED}❌ Homebrew not found${NC}"
        echo "Please install Homebrew first: https://brew.sh"
        exit 1
    fi
fi

# Clean up old DMG if exists
rm -f "$OUTPUT_DIR/${DMG_NAME}.dmg"

echo -e "${BLUE}📦 Creating DMG...${NC}"

# Create DMG with drag-to-Applications
create-dmg \
  --volname "$APP_NAME Installer" \
  --volicon "${APP_PATH}/Contents/Resources/icon.icns" \
  --window-pos 200 120 \
  --window-size 800 450 \
  --icon-size 100 \
  --icon "${APP_NAME}.app" 200 190 \
  --hide-extension "${APP_NAME}.app" \
  --app-drop-link 600 190 \
  --no-internet-enable \
  "$OUTPUT_DIR/${DMG_NAME}.dmg" \
  "$APP_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 DMG Created Successfully! 🎉              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}✅ DMG created at: $OUTPUT_DIR/${DMG_NAME}.dmg${NC}"
    echo ""

    # Get DMG size
    DMG_SIZE=$(du -h "$OUTPUT_DIR/${DMG_NAME}.dmg" | cut -f1)
    echo "File size: $DMG_SIZE"
    echo ""

    echo "To distribute:"
    echo "  1. Upload the DMG to your hosting service"
    echo "  2. Share the download link in your blog post"
    echo "  3. Users can download and drag the app to Applications"
    echo ""

    # Calculate checksum for verification
    echo "SHA-256 checksum (for verification):"
    shasum -a 256 "$OUTPUT_DIR/${DMG_NAME}.dmg"
    echo ""

    echo -e "${BLUE}Next steps:${NC}"
    echo "  • Test the DMG by mounting it and installing the app"
    echo "  • Code sign the DMG for distribution (optional but recommended)"
    echo "  • Notarize with Apple for Gatekeeper approval (optional)"
    echo ""
else
    echo -e "${RED}❌ Error: Failed to create DMG${NC}"
    exit 1
fi
