#!/bin/bash
# Remote installer for Coding Agent Notifications
# Can be run with: curl -fsSL https://your-domain.com/install.sh | bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO_URL="https://github.com/cooperveysey/coding-agent-notifications"  # Update this
RELEASE_URL="${REPO_URL}/releases/latest/download"
INSTALL_DIR="$HOME/.claude"
TMP_DIR="/tmp/claude-notifications-install"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Coding Agent Notifications - Quick Install           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ Error: This installer is for macOS only${NC}"
    echo "Please visit $REPO_URL for other installation options"
    exit 1
fi

# Check if Claude Code is installed
if [ ! -d ~/.claude ] && [ ! -f ~/.claude/settings.json ] && [ ! -f ~/.config/claude/settings.json ]; then
    echo -e "${YELLOW}⚠️  Warning: Claude Code doesn't appear to be installed${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Clean and create temp directory
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
cd "$TMP_DIR"

echo -e "${BLUE}📥 Downloading installation package...${NC}"

# Download the latest release
# For now, we'll clone the repo. In production, use GitHub releases
if command -v git &> /dev/null; then
    git clone --depth 1 "$REPO_URL" . 2>/dev/null || {
        echo -e "${RED}❌ Error: Failed to download installation files${NC}"
        echo "Please check your internet connection and try again"
        exit 1
    }
    echo -e "${GREEN}✅ Downloaded${NC}"
else
    echo -e "${RED}❌ Error: git not found${NC}"
    echo "Please install git or download the app manually from:"
    echo "$REPO_URL"
    exit 1
fi

echo ""

# Check for required dependencies
echo -e "${BLUE}🔍 Checking dependencies...${NC}"

# Check/install jq
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found. Installing via Homebrew...${NC}"
    if command -v brew &> /dev/null; then
        brew install jq
    else
        echo -e "${RED}❌ Homebrew not found${NC}"
        echo "Please install Homebrew from https://brew.sh"
        exit 1
    fi
fi

# Check/install terminal-notifier
TERMINAL_NOTIFIER_INSTALLED=false
if command -v terminal-notifier &> /dev/null; then
    TERMINAL_NOTIFIER_INSTALLED=true
    echo -e "${GREEN}✅ terminal-notifier found${NC}"
else
    echo -e "${YELLOW}⚠️  terminal-notifier not found${NC}"
    # We'll bundle it with the installation
fi

echo ""

# Create directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p "$INSTALL_DIR/scripts"
mkdir -p "$INSTALL_DIR/voices/global"
mkdir -p "$INSTALL_DIR/terminal-notifier"
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Install scripts
echo -e "${BLUE}📝 Installing notification scripts...${NC}"
if [ -d "scripts" ]; then
    cp scripts/*.sh "$INSTALL_DIR/scripts/"
    chmod +x "$INSTALL_DIR/scripts/"*.sh
    echo -e "${GREEN}✅ Scripts installed${NC}"

    # List installed scripts
    echo "   Installed scripts:"
    for script in "$INSTALL_DIR/scripts/"*.sh; do
        [ -f "$script" ] && echo "   • $(basename "$script")"
    done
else
    echo -e "${RED}❌ Error: Scripts directory not found${NC}"
    exit 1
fi
echo ""

# Install voice files if available
echo -e "${BLUE}🎵 Installing default voice files...${NC}"
if [ -f "Notification audio.mp3" ]; then
    cp "Notification audio.mp3" "$INSTALL_DIR/voices/global/notification.mp3" 2>/dev/null || true
fi
if [ -f "Stop notification.mp3" ]; then
    cp "Stop notification.mp3" "$INSTALL_DIR/voices/global/stop.mp3" 2>/dev/null || true
fi
if [ -f "PreToolUse notification.mp3" ]; then
    cp "PreToolUse notification.mp3" "$INSTALL_DIR/voices/global/pre_tool_use.mp3" 2>/dev/null || true
fi
if [ -f "PostToolUse notification.mp3" ]; then
    cp "PostToolUse notification.mp3" "$INSTALL_DIR/voices/global/post_tool_use.mp3" 2>/dev/null || true
fi
if [ -f "SubagentStop notification.mp3" ]; then
    cp "SubagentStop notification.mp3" "$INSTALL_DIR/voices/global/subagent_stop.mp3" 2>/dev/null || true
fi

voice_count=$(ls -1 "$INSTALL_DIR/voices/global/"*.mp3 2>/dev/null | wc -l | tr -d ' ')
if [ "$voice_count" -gt 0 ]; then
    echo -e "${GREEN}✅ Installed $voice_count voice files${NC}"
else
    echo -e "${YELLOW}⚠️  No voice files installed - will use system sounds${NC}"
fi
echo ""

# Install terminal-notifier if not already installed
if [ "$TERMINAL_NOTIFIER_INSTALLED" = false ]; then
    echo -e "${BLUE}🔔 Installing terminal-notifier...${NC}"
    if command -v brew &> /dev/null; then
        brew install terminal-notifier
        echo -e "${GREEN}✅ terminal-notifier installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not install terminal-notifier${NC}"
        echo "   Visual notifications will be disabled"
    fi
    echo ""
fi

# Create configuration file
echo -e "${BLUE}⚙️  Setting up configuration...${NC}"
if [ -f "$INSTALL_DIR/audio-notifier.yaml" ]; then
    echo -e "${YELLOW}⚠️  Configuration file already exists${NC}"
    echo "   Your existing configuration will be preserved"
else
    cat > "$INSTALL_DIR/audio-notifier.yaml" << 'EOF'
# Coding Agent Notifications Configuration
events:
  notification:
    audio_enabled: true
    visual_enabled: true
    audio_file: ~/.claude/voices/global/notification.mp3
    respect_focus: false

  stop:
    audio_enabled: true
    visual_enabled: true
    audio_file: ~/.claude/voices/global/stop.mp3
    respect_focus: false

  pre_tool_use:
    audio_enabled: true
    visual_enabled: true
    audio_file: ~/.claude/voices/global/pre_tool_use.mp3
    respect_focus: false

  post_tool_use:
    audio_enabled: true
    visual_enabled: true
    audio_file: ~/.claude/voices/global/post_tool_use.mp3
    respect_focus: false

  subagent_stop:
    audio_enabled: true
    visual_enabled: true
    audio_file: ~/.claude/voices/global/subagent_stop.mp3
    respect_focus: false

settings:
  min_interval_seconds: 2
  log_enabled: true
  log_file: ~/.claude/notifications.log
  debug: false
  debug_file: ~/.claude/smart-notify-debug.log
EOF
    echo -e "${GREEN}✅ Created configuration file${NC}"
fi
echo ""

# Enable sounds
echo -e "${BLUE}🔊 Enabling notifications...${NC}"
touch "$INSTALL_DIR/.sounds-enabled"
echo -e "${GREEN}✅ Notifications enabled${NC}"
echo ""

# Configure Claude Code hooks
echo -e "${BLUE}🔗 Configuring Claude Code hooks...${NC}"

CLAUDE_SETTINGS=""
if [ -f ~/.claude/settings.json ]; then
    CLAUDE_SETTINGS=~/.claude/settings.json
elif [ -f ~/.config/claude/settings.json ]; then
    CLAUDE_SETTINGS=~/.config/claude/settings.json
fi

if [ -z "$CLAUDE_SETTINGS" ]; then
    CLAUDE_SETTINGS=~/.claude/settings.json
    mkdir -p ~/.claude
    echo '{}' > "$CLAUDE_SETTINGS"
    echo -e "${YELLOW}⚠️  Created new settings file${NC}"
fi

# Backup existing settings
cp "$CLAUDE_SETTINGS" "${CLAUDE_SETTINGS}.backup-$(date +%Y%m%d-%H%M%S)"

# Add hooks using jq
jq '. + {
    "hooks": {
        "Notification": [
            {
                "type": "command",
                "command": "EVENT_TYPE=\"notification\" bash ~/.claude/scripts/smart-notify.sh"
            }
        ],
        "Stop": [
            {
                "type": "command",
                "command": "EVENT_TYPE=\"stop\" bash ~/.claude/scripts/smart-notify.sh"
            }
        ],
        "PreToolUse": [
            {
                "type": "command",
                "command": "EVENT_TYPE=\"pre_tool_use\" bash ~/.claude/scripts/smart-notify.sh"
            }
        ],
        "PostToolUse": [
            {
                "type": "command",
                "command": "EVENT_TYPE=\"post_tool_use\" bash ~/.claude/scripts/smart-notify.sh"
            }
        ],
        "SubagentStop": [
            {
                "type": "command",
                "command": "EVENT_TYPE=\"subagent_stop\" bash ~/.claude/scripts/smart-notify.sh"
            }
        ]
    }
}' "$CLAUDE_SETTINGS" > "${CLAUDE_SETTINGS}.tmp"

mv "${CLAUDE_SETTINGS}.tmp" "$CLAUDE_SETTINGS"
echo -e "${GREEN}✅ Claude Code hooks configured${NC}"
echo ""

# Clean up
cd ~
rm -rf "$TMP_DIR"

# Installation complete
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Installation Complete! 🎉                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ All components installed successfully${NC}"
echo ""
echo "Installed components:"
echo "  • Notification scripts  → ~/.claude/scripts/"
echo "  • Configuration file    → ~/.claude/audio-notifier.yaml"
echo "  • Voice files          → ~/.claude/voices/global/"
echo "  • Claude Code hooks    → $CLAUDE_SETTINGS"
echo ""

echo -e "${YELLOW}⚠️  Important: Restart any active Claude Code sessions${NC}"
echo "   Hooks only take effect in new sessions"
echo ""

echo "To customize notifications:"
echo "  • Download the GUI app: $REPO_URL"
echo "  • Or edit: ~/.claude/audio-notifier.yaml"
echo ""

echo "To uninstall:"
echo "  • Run: bash ~/.claude/scripts/audio-notifier-uninstall.sh"
echo ""

echo -e "${GREEN}Happy coding with notifications! 🚀${NC}"
