#!/bin/bash
# Quick installer - downloads and opens the DMG via terminal
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
REPO_USER="cwveysey"
REPO_NAME="coding-agent-notifications"
DMG_NAME="Coding-Agent-Notifications-Installer.dmg"
DOWNLOAD_URL="https://github.com/${REPO_USER}/${REPO_NAME}/releases/latest/download/${DMG_NAME}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Coding Agent Notifications - Quick Install           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${YELLOW}⚠️  This installer is for macOS only${NC}"
    exit 1
fi

echo -e "${BLUE}📥 Downloading installer...${NC}"

# Download to temp directory
TMP_DIR=$(mktemp -d)
DMG_PATH="${TMP_DIR}/${DMG_NAME}"

curl -L --progress-bar "${DOWNLOAD_URL}" -o "${DMG_PATH}"

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}❌ Download failed${NC}"
    echo "Please download manually from:"
    echo "https://github.com/${REPO_USER}/${REPO_NAME}/releases/latest"
    exit 1
fi

echo -e "${GREEN}✅ Downloaded${NC}"
echo ""

# Get file size for confirmation
FILE_SIZE=$(du -h "${DMG_PATH}" | cut -f1)
echo "File size: ${FILE_SIZE}"
echo ""

echo -e "${BLUE}📦 Opening installer...${NC}"

# Open the DMG
open "${DMG_PATH}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                 Installer Opened! 🎉                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "  1. Drag 'Coding agent notifications.app' to Applications"
echo "  2. Launch the app from Applications"
echo "  3. The app will install all components automatically"
echo "  4. Restart any active Claude Code sessions"
echo ""
echo -e "${BLUE}The DMG file will remain in: ${TMP_DIR}${NC}"
echo "You can delete it after installation is complete."
echo ""
