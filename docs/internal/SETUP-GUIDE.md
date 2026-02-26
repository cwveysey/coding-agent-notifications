# Setup Guide - Getting URLs Ready for Your Blog Post

## Step-by-Step Instructions

### Step 1: Build the DMG ✅

```bash
# Make sure your Tauri app is built first
cd config-editor-app
npm run tauri:build
cd ..

# Create the DMG (will install create-dmg if needed)
./create-dmg.sh
```

**Output:** `dist/Coding-Agent-Notifications-Installer.dmg`

---

### Step 2: Create GitHub Release

```bash
# Tag this version
git tag v1.0.0
git push origin v1.0.0

# Create the release and upload DMG
gh release create v1.0.0 \
  --title "Coding Agent Notifications v1.0.0" \
  --notes "Initial release - Audio and visual notifications for Claude Code events" \
  dist/Coding-Agent-Notifications-Installer.dmg
```

**Note:** Even though your repo is private, you can make releases public:

```bash
# If you want public releases on a private repo, add --discussion-category flag
gh release create v1.0.0 \
  --title "Coding Agent Notifications v1.0.0" \
  --notes "Initial release - Audio and visual notifications for Claude Code events" \
  dist/Coding-Agent-Notifications-Installer.dmg
```

Or go to GitHub.com:
1. Navigate to: https://github.com/cwveysey/coding-agent-notifications/releases
2. Click "Create a new release"
3. Tag: `v1.0.0`
4. Title: `Coding Agent Notifications v1.0.0`
5. Description: Your release notes
6. Upload: `dist/Coding-Agent-Notifications-Installer.dmg`
7. ✅ Check "Set as the latest release"
8. Click "Publish release"

---

### Step 3: Upload install.sh to cooperveysey.com

You need to host `install-dmg.sh` as `install.sh` on your website.

**Copy it for uploading:**

```bash
# Create a web-ready version
cp install-dmg.sh install.sh
```

**Upload to:** `cooperveysey.com/install.sh`

This could be:
- Via FTP/SFTP to your web server
- Via your hosting control panel
- Via git if cooperveysey.com is deployed from a repo
- In your website's public directory

**Test it works:**
```bash
curl -fsSL https://cooperveysey.com/install.sh
# Should output the script content
```

---

### Step 4: Get Your URLs for the Blog Post

Once the release is created, you have two URLs:

#### 1. **Direct Download URL** (for download button)
```
https://github.com/cwveysey/coding-agent-notifications/releases/latest/download/Coding-Agent-Notifications-Installer.dmg
```

#### 2. **Terminal Install Command** (for terminal users)
```bash
curl -fsSL https://cooperveysey.com/install.sh | bash
```

---

## For Your Blog Post

### HTML Download Button

```html
<a href="https://github.com/cwveysey/coding-agent-notifications/releases/latest/download/Coding-Agent-Notifications-Installer.dmg"
   class="download-button">
  Download for macOS
</a>
```

### Markdown Version

```markdown
[Download for macOS](https://github.com/cwveysey/coding-agent-notifications/releases/latest/download/Coding-Agent-Notifications-Installer.dmg)
```

### Installation Instructions for Blog

```markdown
## Installation

### Option 1: Download the App (Recommended)

[Download Coding Agent Notifications](https://github.com/cwveysey/coding-agent-notifications/releases/latest/download/Coding-Agent-Notifications-Installer.dmg)

1. Open the downloaded DMG file
2. Drag the app to your Applications folder
3. Launch the app from Applications
4. Installation happens automatically on first launch
5. Restart any active Claude Code sessions

### Option 2: Quick Install via Terminal

```bash
curl -fsSL https://cooperveysey.com/install.sh | bash
```

This downloads the installer and opens it for you. Then follow steps 2-5 above.

**System Requirements:** macOS 10.15 or later
```

---

## Verification Checklist

Before publishing your blog post, verify:

- [ ] DMG built successfully (`dist/Coding-Agent-Notifications-Installer.dmg` exists)
- [ ] GitHub release created (v1.0.0)
- [ ] DMG uploaded to GitHub release
- [ ] Download URL works in browser:
  - https://github.com/cwveysey/coding-agent-notifications/releases/latest/download/Coding-Agent-Notifications-Installer.dmg
- [ ] `install.sh` uploaded to cooperveysey.com
- [ ] Terminal command works:
  - `curl -fsSL https://cooperveysey.com/install.sh | bash`
- [ ] DMG opens when downloaded
- [ ] App installs hooks correctly when launched

---

## Testing Your Installation

**Test the download URL:**
```bash
# Download to verify it works
curl -L -O "https://github.com/cwveysey/coding-agent-notifications/releases/latest/download/Coding-Agent-Notifications-Installer.dmg"

# Should download the DMG file
open Coding-Agent-Notifications-Installer.dmg
```

**Test the terminal installer:**
```bash
# Run the terminal command
curl -fsSL https://cooperveysey.com/install.sh | bash

# Should download and open the DMG
```

---

## Future Updates

When you release v1.1.0:

```bash
# Build new DMG
./create-dmg.sh

# Create new release
git tag v1.1.0
git push origin v1.1.0

gh release create v1.1.0 \
  --title "Coding Agent Notifications v1.1.0" \
  --notes "What's new in v1.1.0..." \
  dist/Coding-Agent-Notifications-Installer.dmg
```

**Your blog post URLs don't change!** The `/latest/` URL automatically points to the newest release.

---

## Troubleshooting

### "Release not found" error
- Make sure the release is published (not draft)
- Check the release is marked as "latest"
- Verify your repo name matches: `cwveysey/coding-agent-notifications`

### Download URL returns 404
- Ensure the DMG file is attached to the release
- Check filename matches exactly: `Coding-Agent-Notifications-Installer.dmg`
- Verify release is public (Settings → Options → Releases visibility)

### Terminal install fails
- Check `install.sh` is accessible: `curl https://cooperveysey.com/install.sh`
- Verify GitHub release exists and is public
- Check DMG download URL works in browser first

---

## Quick Reference

**Your Repo:**
```
https://github.com/cwveysey/coding-agent-notifications
```

**Releases Page:**
```
https://github.com/cwveysey/coding-agent-notifications/releases
```

**Download URL (for blog button):**
```
https://github.com/cwveysey/coding-agent-notifications/releases/latest/download/Coding-Agent-Notifications-Installer.dmg
```

**Terminal Install Command:**
```bash
curl -fsSL https://cooperveysey.com/install.sh | bash
```

---

## Privacy Notes

- Your main repo stays private
- GitHub releases are public (so people can download)
- Only the DMG file is public - source code stays private
- `install.sh` on your website is also public (it's just a download script)

This gives you public distribution without exposing your source code! 🎉
