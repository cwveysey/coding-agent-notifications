#!/bin/bash
# Audio Notifications for Claude Code - Web Install Script
# Usage: curl -fsSL https://your-domain.com/install.sh | bash

set -e

echo "🔊 Installing Audio Notifications for Claude Code..."
echo ""

# Check if Claude Code is installed
if [ ! -d "$HOME/.claude" ]; then
    echo "❌ Error: Claude Code not found at ~/.claude"
    echo "   Please install Claude Code first: https://claude.ai/download"
    exit 1
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p "$HOME/.claude/scripts"
mkdir -p "$HOME/.claude/voices/global"
mkdir -p "$HOME/.claude/sounds"

# Download and install scripts
echo "📥 Downloading notification scripts..."

REPO_BASE="https://raw.githubusercontent.com/cooperveysey/audio-notifications-for-claude-code-activity/main/config-editor-app/src-tauri/resources"

curl -fsSL "$REPO_BASE/scripts/smart-notify.sh" -o "$HOME/.claude/scripts/smart-notify.sh"
curl -fsSL "$REPO_BASE/scripts/select-sound.sh" -o "$HOME/.claude/scripts/select-sound.sh"
curl -fsSL "$REPO_BASE/scripts/read-config.sh" -o "$HOME/.claude/scripts/read-config.sh"

# Make scripts executable
chmod +x "$HOME/.claude/scripts/smart-notify.sh"
chmod +x "$HOME/.claude/scripts/select-sound.sh"
chmod +x "$HOME/.claude/scripts/read-config.sh"

# Download voice files
echo "🎤 Downloading voice files..."
curl -fsSL "$REPO_BASE/voices/notification.mp3" -o "$HOME/.claude/voices/global/notification.mp3"
curl -fsSL "$REPO_BASE/voices/stop.mp3" -o "$HOME/.claude/voices/global/stop.mp3"
curl -fsSL "$REPO_BASE/voices/pre_tool_use.mp3" -o "$HOME/.claude/voices/global/pre_tool_use.mp3"
curl -fsSL "$REPO_BASE/voices/post_tool_use.mp3" -o "$HOME/.claude/voices/global/post_tool_use.mp3"
curl -fsSL "$REPO_BASE/voices/subagent_stop.mp3" -o "$HOME/.claude/voices/global/subagent_stop.mp3"

# Create default config
echo "⚙️  Creating default configuration..."
cat > "$HOME/.claude/audio-notifier.yaml" << 'EOF'
global_mode: true
global_settings:
  enabled: true
  event_sounds:
    notification: voice:simple
    stop: voice:simple
    pre_tool_use: voice:simple
    post_tool_use: voice:simple
    subagent_stop: voice:simple
  event_enabled:
    notification: true
    stop: true
    pre_tool_use: true
    post_tool_use: true
    subagent_stop: true
  voice_enabled:
    notification: true
    stop: true
    pre_tool_use: true
    post_tool_use: true
    subagent_stop: true
  voice_template: '{event} event'
  voice_provider: fish_audio
  voice_id: null
  fish_audio_api_key: null
  respect_do_not_disturb: false
projects: []
sound_library:
  - /System/Library/Sounds/Ping.aiff
  - /System/Library/Sounds/Glass.aiff
  - /System/Library/Sounds/Hero.aiff
  - /System/Library/Sounds/Submarine.aiff
  - /System/Library/Sounds/Tink.aiff
  - /System/Library/Sounds/Pop.aiff
  - /System/Library/Sounds/Funk.aiff
  - /System/Library/Sounds/Purr.aiff
  - /System/Library/Sounds/Blow.aiff
  - /System/Library/Sounds/Bottle.aiff
  - /System/Library/Sounds/Frog.aiff
  - /System/Library/Sounds/Basso.aiff
min_interval: 2
debug: false
EOF

# Update settings.json with hooks
echo "🔗 Configuring Claude Code hooks..."

SETTINGS_FILE="$HOME/.claude/settings.json"

# Backup existing settings
if [ -f "$SETTINGS_FILE" ]; then
    cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup.$(date +%s)"
fi

# Create or update settings.json
if [ -f "$SETTINGS_FILE" ]; then
    # Use jq if available, otherwise use Python
    if command -v jq &> /dev/null; then
        jq '.hooks = {
            "Notification": [{
                "matcher": "",
                "hooks": [{
                    "type": "command",
                    "command": "bash '"$HOME"'/.claude/scripts/smart-notify.sh notification"
                }]
            }],
            "Stop": [{
                "matcher": ".*",
                "hooks": [
                    {
                        "type": "command",
                        "command": "jq -c -r \".\" >> '"$HOME"'/.claude/stop-input.jsonl || cat >> '"$HOME"'/.claude/stop-input.jsonl"
                    },
                    {
                        "type": "command",
                        "command": "bash '"$HOME"'/.claude/scripts/smart-notify.sh stop"
                    }
                ]
            }],
            "PreToolUse": [{
                "matcher": "",
                "hooks": [{
                    "type": "command",
                    "command": "bash '"$HOME"'/.claude/scripts/smart-notify.sh pre_tool_use"
                }]
            }],
            "PostToolUse": [{
                "matcher": "",
                "hooks": [{
                    "type": "command",
                    "command": "bash '"$HOME"'/.claude/scripts/smart-notify.sh post_tool_use"
                }]
            }],
            "SubagentStop": [{
                "matcher": "",
                "hooks": [{
                    "type": "command",
                    "command": "bash '"$HOME"'/.claude/scripts/smart-notify.sh subagent_stop"
                }]
            }]
        }' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
    else
        # Fallback: create new settings file with hooks
        cat > "$SETTINGS_FILE" << EOF
{
  "hooks": {
    "Notification": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bash $HOME/.claude/scripts/smart-notify.sh notification"
      }]
    }],
    "Stop": [{
      "matcher": ".*",
      "hooks": [
        {
          "type": "command",
          "command": "jq -c -r '.' >> $HOME/.claude/stop-input.jsonl || cat >> $HOME/.claude/stop-input.jsonl"
        },
        {
          "type": "command",
          "command": "bash $HOME/.claude/scripts/smart-notify.sh stop"
        }
      ]
    }],
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bash $HOME/.claude/scripts/smart-notify.sh pre_tool_use"
      }]
    }],
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bash $HOME/.claude/scripts/smart-notify.sh post_tool_use"
      }]
    }],
    "SubagentStop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bash $HOME/.claude/scripts/smart-notify.sh subagent_stop"
      }]
    }]
  }
}
EOF
    fi
else
    # Create new settings file
    cat > "$SETTINGS_FILE" << EOF
{
  "hooks": {
    "Notification": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bash $HOME/.claude/scripts/smart-notify.sh notification"
      }]
    }],
    "Stop": [{
      "matcher": ".*",
      "hooks": [
        {
          "type": "command",
          "command": "jq -c -r '.' >> $HOME/.claude/stop-input.jsonl || cat >> $HOME/.claude/stop-input.jsonl"
        },
        {
          "type": "command",
          "command": "bash $HOME/.claude/scripts/smart-notify.sh stop"
        }
      ]
    }],
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bash $HOME/.claude/scripts/smart-notify.sh pre_tool_use"
      }]
    }],
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bash $HOME/.claude/scripts/smart-notify.sh post_tool_use"
      }]
    }],
    "SubagentStop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bash $HOME/.claude/scripts/smart-notify.sh subagent_stop"
      }]
    }]
  }
}
EOF
fi

# Enable sounds
touch "$HOME/.claude/.sounds-enabled"

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎵 Audio notifications are now enabled for Claude Code."
echo ""
echo "📱 To configure settings, download the GUI app:"
echo "   https://www.cooperveysey.com/claude-audio-notifications"
echo ""
echo "🔧 Or edit the config file directly:"
echo "   $HOME/.claude/audio-notifier.yaml"
echo ""
echo "🧪 Test it by starting a new Claude Code session!"
