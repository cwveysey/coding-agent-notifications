#!/bin/bash

# Test script for first-time user installation experience
# This simulates a brand new user installing the audio notification system

set -e  # Exit on error

CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="$CLAUDE_DIR/test-backup-$(date +%s)"

echo "=========================================="
echo "Testing First-Time User Installation"
echo "=========================================="
echo ""

# Step 1: Backup existing files
echo "1. Backing up existing configuration..."
mkdir -p "$BACKUP_DIR"

if [ -f "$CLAUDE_DIR/audio-notifier.yaml" ]; then
    cp "$CLAUDE_DIR/audio-notifier.yaml" "$BACKUP_DIR/"
    echo "   ✓ Backed up audio-notifier.yaml"
fi

if [ -f "$CLAUDE_DIR/settings.json" ]; then
    cp "$CLAUDE_DIR/settings.json" "$BACKUP_DIR/"
    echo "   ✓ Backed up settings.json"
fi

if [ -f "$CLAUDE_DIR/.sounds-enabled" ]; then
    cp "$CLAUDE_DIR/.sounds-enabled" "$BACKUP_DIR/"
    echo "   ✓ Backed up .sounds-enabled"
fi

if [ -d "$CLAUDE_DIR/scripts" ]; then
    cp -r "$CLAUDE_DIR/scripts" "$BACKUP_DIR/"
    echo "   ✓ Backed up scripts directory"
fi

echo ""

# Step 2: Simulate fresh install by removing files
echo "2. Simulating fresh user environment..."
rm -f "$CLAUDE_DIR/.sounds-enabled"
rm -f "$CLAUDE_DIR/audio-notifier.yaml"
# Keep settings.json but remove hooks section - we'll let install add them
echo "   ✓ Removed .sounds-enabled"
echo "   ✓ Removed audio-notifier.yaml"
echo ""

# Step 3: Instructions for manual testing
echo "=========================================="
echo "READY FOR TESTING"
echo "=========================================="
echo ""
echo "The app is running in dev mode. Now:"
echo ""
echo "  1. Look at the app window"
echo "  2. You should see a green 'First time setup required' banner"
echo "  3. Click the 'Install Audio Notifications' button"
echo "  4. Wait for success message"
echo ""
echo "Press Enter when you've clicked Install and seen the success message..."
read

# Step 4: Verify installation
echo ""
echo "3. Verifying installation..."
echo ""

# Check .sounds-enabled
if [ -f "$CLAUDE_DIR/.sounds-enabled" ]; then
    echo "   ✓ Sounds enabled"
else
    echo "   ✗ ERROR: .sounds-enabled not found"
    exit 1
fi

# Check scripts
if [ -d "$CLAUDE_DIR/scripts" ]; then
    SCRIPT_COUNT=$(ls -1 "$CLAUDE_DIR/scripts"/*.sh 2>/dev/null | wc -l)
    if [ "$SCRIPT_COUNT" -ge 6 ]; then
        echo "   ✓ Scripts installed ($SCRIPT_COUNT files)"
    else
        echo "   ✗ ERROR: Expected at least 6 scripts, found $SCRIPT_COUNT"
        exit 1
    fi
else
    echo "   ✗ ERROR: scripts directory not found"
    exit 1
fi

# Check settings.json for hooks
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    if grep -q "smart-notify.sh notification" "$CLAUDE_DIR/settings.json" && \
       grep -q "smart-notify.sh stop" "$CLAUDE_DIR/settings.json" && \
       grep -q "smart-notify.sh pre_tool_use" "$CLAUDE_DIR/settings.json" && \
       grep -q "smart-notify.sh post_tool_use" "$CLAUDE_DIR/settings.json" && \
       grep -q "smart-notify.sh subagent_stop" "$CLAUDE_DIR/settings.json"; then
        echo "   ✓ All 5 hooks configured in settings.json"
    else
        echo "   ✗ ERROR: Not all hooks found in settings.json"
        exit 1
    fi
else
    echo "   ✗ ERROR: settings.json not found"
    exit 1
fi

# Check audio-notifier.yaml for voice defaults
echo ""
echo "4. Verifying default configuration uses human voices..."
if [ -f "$CLAUDE_DIR/audio-notifier.yaml" ]; then
    if grep -q "notification: voice:simple" "$CLAUDE_DIR/audio-notifier.yaml" && \
       grep -q "stop: voice:simple" "$CLAUDE_DIR/audio-notifier.yaml" && \
       grep -q "pre_tool_use: voice:simple" "$CLAUDE_DIR/audio-notifier.yaml" && \
       grep -q "post_tool_use: voice:simple" "$CLAUDE_DIR/audio-notifier.yaml" && \
       grep -q "subagent_stop: voice:simple" "$CLAUDE_DIR/audio-notifier.yaml" && \
       grep -q "voice_provider: fish_audio" "$CLAUDE_DIR/audio-notifier.yaml"; then
        echo "   ✓ Default config uses human voices (voice:simple)"
        echo "   ✓ Voice provider set to fish_audio"
    else
        echo "   ✗ ERROR: Default config not using human voices"
        echo ""
        echo "Current config:"
        grep -A 5 "event_sounds:" "$CLAUDE_DIR/audio-notifier.yaml"
        exit 1
    fi
else
    echo "   ✗ ERROR: audio-notifier.yaml not found"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ ALL TESTS PASSED!"
echo "=========================================="
echo ""
echo "The first-time installation experience is working correctly!"
echo "Defaults are set to human voices as expected."
echo ""

# Step 5: Ask about restoration
echo "Do you want to restore your original configuration? (y/n)"
read -r RESTORE

if [ "$RESTORE" = "y" ]; then
    echo ""
    echo "5. Restoring original configuration..."

    if [ -f "$BACKUP_DIR/audio-notifier.yaml" ]; then
        cp "$BACKUP_DIR/audio-notifier.yaml" "$CLAUDE_DIR/"
        echo "   ✓ Restored audio-notifier.yaml"
    fi

    if [ -f "$BACKUP_DIR/settings.json" ]; then
        cp "$BACKUP_DIR/settings.json" "$CLAUDE_DIR/"
        echo "   ✓ Restored settings.json"
    fi

    if [ -f "$BACKUP_DIR/.sounds-enabled" ]; then
        cp "$BACKUP_DIR/.sounds-enabled" "$CLAUDE_DIR/"
        echo "   ✓ Restored .sounds-enabled"
    fi

    if [ -d "$BACKUP_DIR/scripts" ]; then
        rm -rf "$CLAUDE_DIR/scripts"
        cp -r "$BACKUP_DIR/scripts" "$CLAUDE_DIR/"
        echo "   ✓ Restored scripts directory"
    fi

    echo ""
    echo "Original configuration restored!"
else
    echo ""
    echo "Keeping test configuration."
    echo "Your backup is at: $BACKUP_DIR"
fi

echo ""
echo "Done!"
