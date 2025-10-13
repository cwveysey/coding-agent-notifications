#!/bin/bash
# Installation script for Audio Notifications for Claude Code
set -e

echo "🔔 Installing Audio Notifications for Claude Code..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq is not installed. Installing via Homebrew...${NC}"
    if command -v brew &> /dev/null; then
        brew install jq
    else
        echo -e "${RED}❌ Homebrew not found. Please install jq manually:${NC}"
        echo "   brew install jq"
        exit 1
    fi
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p ~/.claude/scripts
mkdir -p ~/.claude

# Copy scripts
echo "📝 Copying scripts..."
cp scripts/*.sh ~/.claude/scripts/
cp scripts/*.conf.example ~/.claude/scripts/ 2>/dev/null || true
chmod +x ~/.claude/scripts/*.sh

# Copy config
echo "⚙️  Setting up configuration..."
if [ -f ~/.claude/audio-notifier.yaml ]; then
    echo -e "${YELLOW}⚠️  Config file already exists at ~/.claude/audio-notifier.yaml${NC}"
    echo "   Your existing config will be preserved."
else
    cp config/audio-notifier.yaml.example ~/.claude/audio-notifier.yaml
    echo -e "${GREEN}✅ Created ~/.claude/audio-notifier.yaml${NC}"
fi

# Enable sounds by default
if [ ! -f ~/.claude/.sounds-enabled ]; then
    touch ~/.claude/.sounds-enabled
    echo -e "${GREEN}✅ Sounds enabled by default${NC}"
fi

# Check for Claude Code settings
CLAUDE_SETTINGS=""
if [ -f ~/.config/claude/settings.json ]; then
    CLAUDE_SETTINGS=~/.config/claude/settings.json
elif [ -f ~/Library/Application\ Support/Claude/settings.json ]; then
    CLAUDE_SETTINGS=~/Library/Application\ Support/Claude/settings.json
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Installation complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$CLAUDE_SETTINGS" ]; then
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo ""
    echo "1. Add hooks to your Claude Code settings:"
    echo "   Edit: $CLAUDE_SETTINGS"
    echo ""
    echo '   Add this to your settings.json:'
    echo '   {'
    echo '     "hooks": {'
    echo '       "Notification": ['
    echo '         {'
    echo '           "type": "command",'
    echo '           "command": "bash ~/.claude/scripts/smart-notify.sh notification"'
    echo '         }'
    echo '       ],'
    echo '       "Stop": ['
    echo '         {'
    echo '           "type": "command",'
    echo '           "command": "bash ~/.claude/scripts/smart-notify.sh stop"'
    echo '         }'
    echo '       ]'
    echo '     }'
    echo '   }'
    echo ""
else
    echo -e "${YELLOW}⚠️  Could not find Claude Code settings file${NC}"
    echo "   Please manually add hooks to your Claude Code settings"
    echo "   See README.md for instructions"
    echo ""
fi

echo "2. (Optional) Build and run the menu bar app:"
echo "   cd menu-bar-app && ./build.sh"
echo "   ./ClaudeSoundsMenuBar &"
echo ""

echo "3. (Optional) Add shell aliases to ~/.zshrc or ~/.bashrc:"
echo '   alias claude-sounds-on="bash ~/.claude/scripts/toggle-sounds.sh on"'
echo '   alias claude-sounds-off="bash ~/.claude/scripts/toggle-sounds.sh off"'
echo '   alias claude-sounds-status="bash ~/.claude/scripts/toggle-sounds.sh status"'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Happy coding with Claude! 🤖${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
