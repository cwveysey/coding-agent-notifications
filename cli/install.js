#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔊 Installing Audio Notifications for Claude Code...\n');

// Check if running on macOS
if (os.platform() !== 'darwin') {
  console.error('❌ This tool currently only supports macOS');
  process.exit(1);
}

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');

// Check if Claude Code is installed
if (!fs.existsSync(CLAUDE_DIR)) {
  console.error('❌ Error: Claude Code not found at ~/.claude');
  console.error('   Please install Claude Code first: https://claude.ai/download');
  process.exit(1);
}

try {
  // Create directories
  console.log('📁 Creating directories...');
  const dirs = [
    path.join(CLAUDE_DIR, 'scripts'),
    path.join(CLAUDE_DIR, 'voices', 'global'),
    path.join(CLAUDE_DIR, 'sounds')
  ];

  dirs.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // Download scripts
  console.log('📥 Downloading notification scripts...');

  const REPO_BASE = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/config-editor-app/src-tauri/resources';

  const scripts = [
    'smart-notify.sh',
    'select-sound.sh',
    'read-config.sh'
  ];

  scripts.forEach(script => {
    const url = `${REPO_BASE}/scripts/${script}`;
    const dest = path.join(CLAUDE_DIR, 'scripts', script);

    try {
      execSync(`curl -fsSL "${url}" -o "${dest}"`, { stdio: 'inherit' });
      fs.chmodSync(dest, 0o755);
    } catch (error) {
      console.error(`❌ Failed to download ${script}`);
      throw error;
    }
  });

  // Download voice files
  console.log('🎤 Downloading voice files...');

  const voices = [
    'notification.mp3',
    'stop.mp3',
    'pre_tool_use.mp3',
    'post_tool_use.mp3',
    'subagent_stop.mp3'
  ];

  voices.forEach(voice => {
    const url = `${REPO_BASE}/voices/${voice}`;
    const dest = path.join(CLAUDE_DIR, 'voices', 'global', voice);

    try {
      execSync(`curl -fsSL "${url}" -o "${dest}"`, { stdio: 'inherit' });
    } catch (error) {
      console.warn(`⚠️  Failed to download ${voice} (optional)`);
    }
  });

  // Create default config
  console.log('⚙️  Creating default configuration...');

  const configPath = path.join(CLAUDE_DIR, 'audio-notifier.yaml');
  const defaultConfig = `global_mode: true
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
`;

  fs.writeFileSync(configPath, defaultConfig);

  // Configure hooks
  console.log('🔗 Configuring Claude Code hooks...');

  const settingsPath = path.join(CLAUDE_DIR, 'settings.json');

  // Backup existing settings
  if (fs.existsSync(settingsPath)) {
    const backup = `${settingsPath}.backup.${Date.now()}`;
    fs.copyFileSync(settingsPath, backup);
  }

  const hooks = {
    "Notification": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": `bash ${HOME}/.claude/scripts/smart-notify.sh notification`
      }]
    }],
    "Stop": [{
      "matcher": ".*",
      "hooks": [
        {
          "type": "command",
          "command": `jq -c -r '.' >> ${HOME}/.claude/stop-input.jsonl || cat >> ${HOME}/.claude/stop-input.jsonl`
        },
        {
          "type": "command",
          "command": `bash ${HOME}/.claude/scripts/smart-notify.sh stop`
        }
      ]
    }],
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": `bash ${HOME}/.claude/scripts/smart-notify.sh pre_tool_use`
      }]
    }],
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": `bash ${HOME}/.claude/scripts/smart-notify.sh post_tool_use`
      }]
    }],
    "SubagentStop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": `bash ${HOME}/.claude/scripts/smart-notify.sh subagent_stop`
      }]
    }]
  };

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  }

  settings.hooks = hooks;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  // Enable sounds
  fs.writeFileSync(path.join(CLAUDE_DIR, '.sounds-enabled'), '');

  console.log('\n✅ Installation complete!\n');
  console.log('🎵 Audio notifications are now enabled for Claude Code.\n');
  console.log('📱 To configure settings, download the GUI app:');
  console.log('   https://your-domain.com/download\n');
  console.log('🔧 Or edit the config file directly:');
  console.log(`   ${configPath}\n`);
  console.log('🧪 Test it by starting a new Claude Code session!');

} catch (error) {
  console.error('\n❌ Installation failed:', error.message);
  process.exit(1);
}
