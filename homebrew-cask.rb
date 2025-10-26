# Homebrew Cask Formula
# To submit: https://github.com/Homebrew/homebrew-cask/blob/master/CONTRIBUTING.md

cask "audio-notifications-claude" do
  version "1.0.0"
  sha256 "YOUR_SHA256_HERE"  # Generate with: shasum -a 256 YourApp.dmg

  url "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v#{version}/AudioNotifications.dmg"
  name "Audio Notifications for Claude Code"
  desc "Audio notifications for Claude Code events"
  homepage "https://your-domain.com"

  # Requires macOS 11 or later
  depends_on macos: ">= :big_sur"

  app "Audio Notifications.app"

  # Run post-installation setup
  postflight do
    system_command "#{appdir}/Audio Notifications.app/Contents/MacOS/audio-notifier-config-editor",
                   args: ["--install"],
                   sudo: false
  end

  # Cleanup on uninstall
  uninstall delete: [
    "~/.claude/scripts/smart-notify.sh",
    "~/.claude/scripts/select-sound.sh",
    "~/.claude/scripts/read-config.sh",
    "~/.claude/voices/global",
    "~/.claude/.sounds-enabled"
  ]

  zap trash: [
    "~/.claude/audio-notifier.yaml",
    "~/Library/Preferences/com.audio-notifier-config-editor.plist",
    "~/Library/Saved Application State/com.audio-notifier-config-editor.savedState"
  ]
end
