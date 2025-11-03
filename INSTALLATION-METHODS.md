# Installation Methods - Comparison

## Recommended Approach: DMG with Terminal Helper

### Method 1: Direct Download (via Blog Button)

**User clicks button on blog** → Downloads DMG → Drags to Applications → Launch app → Done

**Your setup:**
```html
<a href="https://github.com/cooperveysey/REPO_NAME/releases/latest/download/Coding-Agent-Notifications-Installer.dmg">
  Download Installer
</a>
```

**Benefits:**
- Most familiar for Mac users
- Visual, guided experience
- One static URL that never changes
- No repo needs to be public

---

### Method 2: Terminal Download (Same DMG)

**User runs one command** → DMG downloads & opens → Drags to Applications → Launch app → Done

**Command:**
```bash
curl -fsSL https://raw.githubusercontent.com/cooperveysey/REPO_NAME/main/install-dmg.sh | bash
```

**Benefits:**
- Quick for terminal users
- Shareable as a single command
- Downloads the exact same DMG as Method 1
- No custom installation logic needed

**What it does:**
1. Downloads the DMG from GitHub releases
2. Opens the DMG automatically
3. User drags app to Applications (same as Method 1)
4. Rest is identical to Method 1

---

## What You Need

### For Both Methods:
1. **DMG file** - Created with `./create-dmg.sh`
2. **GitHub Release** - Hosts the DMG
3. **Private or public repo** - Your choice! (releases can be public even with private repo)

### Additional for Terminal Method:
4. **`install-dmg.sh` script** - Must be in a public location
   - Option A: Public repo (even a gist works)
   - Option B: Your website (cooperveysey.com/install.sh)

---

## Setup Instructions

### Step 1: Build the DMG

```bash
# Make sure your app is built
cd config-editor-app
npm run tauri:build

# Create DMG
cd ..
./create-dmg.sh
```

Result: `dist/Coding-Agent-Notifications-Installer.dmg`

### Step 2: Create GitHub Release

```bash
# Tag your release
git tag v1.0.0
git push origin v1.0.0

# Create release and upload DMG
gh release create v1.0.0 \
  --title "v1.0.0" \
  --notes "Initial release" \
  dist/Coding-Agent-Notifications-Installer.dmg
```

**Your DMG is now at:**
```
https://github.com/cooperveysey/REPO_NAME/releases/latest/download/Coding-Agent-Notifications-Installer.dmg
```

### Step 3a: Add Download Button to Blog

```html
<a href="https://github.com/cooperveysey/REPO_NAME/releases/latest/download/Coding-Agent-Notifications-Installer.dmg"
   class="download-button">
  Download for macOS
</a>
```

### Step 3b: Enable Terminal Install (Optional)

**Option 1: Public Repo/Gist**

1. Create a public repo or GitHub gist
2. Add `install-dmg.sh` to it
3. Update line 9-10 in `install-dmg.sh` with your repo name
4. Share command:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/cooperveysey/REPO_NAME/main/install-dmg.sh | bash
   ```

**Option 2: Self-Host on Your Website**

1. Upload `install-dmg.sh` to cooperveysey.com
2. Share command:
   ```bash
   curl -fsSL https://cooperveysey.com/install.sh | bash
   ```

---

## Blog Post Installation Section

```markdown
## Installation

### Download the App

[Download for macOS](https://github.com/cooperveysey/REPO_NAME/releases/latest/download/Coding-Agent-Notifications-Installer.dmg)

1. Open the downloaded DMG file
2. Drag the app to your Applications folder
3. Launch the app - installation happens automatically
4. Restart any active Claude Code sessions

### Quick Install via Terminal

Prefer the command line? Run this:

```bash
curl -fsSL https://cooperveysey.com/install.sh | bash
```

Then drag the app to Applications when prompted.

**Note:** Both methods install the exact same app. Choose whichever you prefer!
```

---

## Future Updates

When you release v1.1.0:

```bash
# Build new version
./create-dmg.sh

# Create new release
gh release create v1.1.0 \
  --title "v1.1.0" \
  --notes "New features..." \
  dist/Coding-Agent-Notifications-Installer.dmg
```

**Your URLs don't change!** The `/latest/` URL automatically points to v1.1.0.

Users who previously downloaded v1.0.0 can:
- Download again from the same blog button URL
- Run the same terminal command
- Check releases page for changelog

---

## File Structure Summary

### What Goes Where

**Your Private Repo (optional - can be public too):**
```
coding-agent-notifications/
├── config-editor-app/          # Your Tauri app source (private)
├── create-dmg.sh              # DMG builder
├── install-dmg.sh             # Terminal installer
└── dist/
    └── Coding-Agent-Notifications-Installer.dmg
```

**GitHub Releases (public):**
- `Coding-Agent-Notifications-Installer.dmg` (each version)

**Your Website (cooperveysey.com):**
- Blog post with download button
- `install.sh` (copy of install-dmg.sh) - optional

**User's Computer After Installation:**
```
/Applications/Coding Agent Notifications.app
~/.claude/
  ├── scripts/
  ├── voices/global/
  ├── terminal-notifier.app/
  ├── audio-notifier.yaml
  └── settings.json (updated with hooks)
```

---

## Comparison: Terminal Methods

### Old Approach (install-remote.sh)
- Clones entire repo with scripts
- Installs scripts directly via bash
- Requires public repo with all installation files
- Different installation path than DMG

### New Approach (install-dmg.sh) ✅
- Downloads the DMG file
- Opens it for user
- Same installation experience as blog download
- Only needs `install-dmg.sh` to be public (or self-hosted)
- Consistent installation regardless of method

---

## What Repo Needs to be Public?

**Answer: Nothing, if you want!**

- GitHub releases can be public even with a private repo
- Blog button downloads from public release
- Terminal command can download from public release
- `install-dmg.sh` can be hosted on your website instead of GitHub

**If you want terminal install from GitHub:**
- Create a separate public repo with just `install-dmg.sh` and README
- Or use a GitHub gist
- Main app code stays private

**Recommended:**
1. Keep main app repo private (or public - your choice)
2. Use public GitHub releases for DMG hosting
3. Host `install-dmg.sh` on cooperveysey.com for terminal install
4. Best of both worlds - no code exposed, both install methods work
