#!/bin/bash
# Comprehensive installer script for Coding Agent Notifications
# This script is called by the Tauri app to install all components
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine the path to the app bundle resources
if [ -n "$1" ]; then
    # Path provided as argument (called from Tauri app)
    RESOURCES_DIR="$1"
else
    # Try to detect if running from within the app bundle
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    if [[ "$SCRIPT_DIR" == *".app/Contents/Resources"* ]]; then
        RESOURCES_DIR="$SCRIPT_DIR/resources"
    else
        echo -e "${RED}❌ Error: Could not determine resource directory${NC}"
        echo "This script should be called with the resources directory path as an argument"
        exit 1
    fi
fi

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Coding Agent Notifications - Installation            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify resources directory exists
if [ ! -d "$RESOURCES_DIR" ]; then
    echo -e "${RED}❌ Error: Resources directory not found: $RESOURCES_DIR${NC}"
    exit 1
fi

# Step 1: Create directories
echo -e "${BLUE}📁 Step 1: Creating directories...${NC}"
mkdir -p ~/.claude/scripts
mkdir -p ~/.claude/voices/global
mkdir -p ~/.claude/terminal-notifier
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Step 2: Install scripts
echo -e "${BLUE}📝 Step 2: Installing notification scripts...${NC}"
if [ -d "$RESOURCES_DIR/scripts" ]; then
    cp "$RESOURCES_DIR/scripts/"*.sh ~/.claude/scripts/
    chmod +x ~/.claude/scripts/*.sh
    echo -e "${GREEN}✅ Scripts installed to ~/.claude/scripts/${NC}"

    # List installed scripts
    echo "   Installed scripts:"
    for script in ~/.claude/scripts/*.sh; do
        echo "   • $(basename "$script")"
    done
else
    echo -e "${RED}❌ Error: Scripts directory not found in resources${NC}"
    exit 1
fi
echo ""

# Step 3: Install terminal-notifier
echo -e "${BLUE}🔔 Step 3: Installing terminal-notifier...${NC}"
if [ -d "$RESOURCES_DIR/terminal-notifier/terminal-notifier.app" ]; then
    # Remove old version if exists
    rm -rf ~/.claude/terminal-notifier/terminal-notifier.app

    # Copy new version
    cp -R "$RESOURCES_DIR/terminal-notifier/terminal-notifier.app" ~/.claude/terminal-notifier/

    # Make executable
    chmod +x ~/.claude/terminal-notifier/terminal-notifier.app/Contents/MacOS/terminal-notifier

    echo -e "${GREEN}✅ terminal-notifier installed${NC}"
else
    echo -e "${YELLOW}⚠️  terminal-notifier not found in app bundle${NC}"
    echo "   Visual notifications may not work without terminal-notifier"
fi
echo ""

# Step 4: Install voice files
echo -e "${BLUE}🎵 Step 4: Installing default voice files...${NC}"
if [ -d "$RESOURCES_DIR/voices" ]; then
    cp "$RESOURCES_DIR/voices/"*.mp3 ~/.claude/voices/global/ 2>/dev/null || true

    voice_count=$(ls -1 ~/.claude/voices/global/*.mp3 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Installed $voice_count voice files${NC}"
else
    echo -e "${YELLOW}⚠️  No voice files found in app bundle${NC}"
fi
echo ""

# Step 5: Create/update configuration file
echo -e "${BLUE}⚙️  Step 5: Setting up configuration...${NC}"
if [ -f ~/.claude/audio-notifier.yaml ]; then
    echo -e "${YELLOW}⚠️  Configuration file already exists${NC}"
    echo "   Your existing configuration will be preserved"
    echo "   Location: ~/.claude/audio-notifier.yaml"
else
    # Create default config
    cat > ~/.claude/audio-notifier.yaml << 'EOF'
# Coding Agent Notifications Configuration
# Location: ~/.claude/audio-notifier.yaml

# Event-specific settings
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

# Global settings
settings:
  min_interval_seconds: 2
  terminal_notifier_path: ~/.claude/terminal-notifier/terminal-notifier.app/Contents/MacOS/terminal-notifier
  log_enabled: true
  log_file: ~/.claude/notifications.log
  debug: false
  debug_file: ~/.claude/smart-notify-debug.log
EOF
    echo -e "${GREEN}✅ Created configuration file${NC}"
    echo "   Location: ~/.claude/audio-notifier.yaml"
fi
echo ""

# Step 6: Enable sounds
echo -e "${BLUE}🔊 Step 6: Enabling notifications...${NC}"
touch ~/.claude/.sounds-enabled
echo -e "${GREEN}✅ Notifications enabled by default${NC}"
echo ""

# Step 7: Update Claude Code settings with hooks
echo -e "${BLUE}🔗 Step 7: Configuring Claude Code hooks...${NC}"

# Locate Claude Code settings file
CLAUDE_SETTINGS=""
if [ -f ~/.claude/settings.json ]; then
    CLAUDE_SETTINGS=~/.claude/settings.json
elif [ -f ~/.config/claude/settings.json ]; then
    CLAUDE_SETTINGS=~/.config/claude/settings.json
elif [ -f ~/Library/Application\ Support/Claude/settings.json ]; then
    CLAUDE_SETTINGS=~/Library/Application\ Support/Claude/settings.json
fi

if [ -z "$CLAUDE_SETTINGS" ]; then
    # Create new settings file
    CLAUDE_SETTINGS=~/.claude/settings.json
    mkdir -p ~/.claude
    echo '{}' > "$CLAUDE_SETTINGS"
    echo -e "${YELLOW}⚠️  Created new settings file: $CLAUDE_SETTINGS${NC}"
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found. Installing via Homebrew...${NC}"
    if command -v brew &> /dev/null; then
        brew install jq
    else
        echo -e "${RED}❌ Homebrew not found${NC}"
        echo -e "${YELLOW}⚠️  Hooks need to be added manually${NC}"
        echo ""
        echo "Please install jq and run this script again, or add hooks manually"
        echo "See: https://stedolan.github.io/jq/download/"
        CLAUDE_SETTINGS=""
    fi
fi

if [ -n "$CLAUDE_SETTINGS" ] && command -v jq &> /dev/null; then
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
    echo "   Settings file: $CLAUDE_SETTINGS"
    echo "   Backup created: ${CLAUDE_SETTINGS}.backup-*"
else
    echo -e "${YELLOW}⚠️  Could not automatically configure hooks${NC}"
fi
echo ""

# Installation summary
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
echo "  • terminal-notifier    → ~/.claude/terminal-notifier/"
echo "  • Claude Code hooks    → $CLAUDE_SETTINGS"
echo ""

echo -e "${YELLOW}⚠️  Important: Restart any active Claude Code sessions${NC}"
echo "   Hooks only take effect in new sessions"
echo ""

echo "To customize your notifications:"
echo "  • Edit: ~/.claude/audio-notifier.yaml"
echo "  • Or use the Coding Agent Notifications app GUI"
echo ""

echo "To uninstall:"
echo "  • Run: bash ~/.claude/scripts/audio-notifier-uninstall.sh"
echo ""

echo -e "${GREEN}Happy coding with notifications! 🚀${NC}"
