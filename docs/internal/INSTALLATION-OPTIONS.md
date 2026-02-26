# Installation Options - Demo

I've created demos for all viable installation methods. Here's what's included:

## ✅ Created Files

### 1. **Shell Script Installer** (`install-web.sh`)
**Usage:**
```bash
curl -fsSL https://your-domain.com/install.sh | bash
```

**What it does:**
- Downloads scripts from your GitHub repo
- Installs to `~/.claude/scripts/`
- Downloads voice files
- Creates config file
- Updates `~/.claude/settings.json` with hooks
- Enables sounds

**Actions:** 1 command

---

### 2. **NPX Package** (`package.json` + `cli/install.js`)
**Usage:**
```bash
npx claude-audio-notifications
```

**What it does:**
- Runs installation script via Node.js
- No permanent installation needed
- Same setup as shell script

**To publish:**
```bash
npm publish
```

**Actions:** 1 command

---

### 3. **Homebrew Cask** (`homebrew-cask.rb`)
**Usage:**
```bash
brew install --cask audio-notifications-claude
```

**What it does:**
- Installs your Tauri app to Applications
- Runs postflight setup automatically
- Provides uninstall command

**To submit to Homebrew:**
1. Create GitHub release with DMG
2. Fork `homebrew-cask` repo
3. Submit PR with `homebrew-cask.rb`

**Actions:** 1 command

---

### 4. **Blog Install Button** (`blog-install-button.html`)
**Demo:** Open in browser to see interactive demo

**Features:**
- Tabbed interface showing all install methods
- Copy-to-clipboard buttons
- Beautiful gradient design
- Analytics tracking ready

**To use:**
1. Host this on your blog
2. Update URLs with your actual download links
3. Add Google Analytics tracking

---

## 📊 Comparison

| Method | Commands | Best For | Setup Required |
|--------|----------|----------|----------------|
| Shell script | 1 | Power users | Host script on web |
| NPX | 1 | Node developers | Publish to npm |
| Homebrew | 1 | Mac developers | Submit to Homebrew |
| Blog button | 1-2 clicks | Everyone | Just embed HTML |

---

## 🚀 Next Steps to Deploy

### For Shell Script:
1. Upload `install-web.sh` to your domain
2. Update `REPO_BASE` URL in script to your GitHub repo
3. Add to blog:
   ```bash
   curl -fsSL https://your-domain.com/install.sh | bash
   ```

### For NPX:
1. Create npm account
2. Update `package.json` with your info
3. Run:
   ```bash
   npm publish
   ```

### For Homebrew:
1. Build DMG with `npm run tauri build`
2. Create GitHub release
3. Generate SHA256: `shasum -a 256 YourApp.dmg`
4. Update `homebrew-cask.rb` with SHA and URL
5. Submit PR to `homebrew/homebrew-cask`

### For Blog Button:
1. Copy `blog-install-button.html` code
2. Embed in your blog post
3. Update download URLs
4. Add analytics tracking

---

## 🎯 My Recommendation

**Start with:**
1. ✅ **Shell script** - Easiest to deploy right now
2. ✅ **Blog button** - Shows all options beautifully
3. ⚡ **NPX** - Easy to add, reaches Node users

**Later:**
4. 🌟 **Homebrew** - Takes time but adds credibility

---

## 📝 About `/plugin`

You're right that Claude Code has `/plugin` - but it's for **slash commands**, not system installation. It lets you add custom commands like `/my-command`, but can't:
- Install shell scripts to `~/.claude/scripts/`
- Modify `~/.claude/settings.json` hooks
- Install system-level audio files

So while plugins exist, your tool needs system-level access that plugins don't provide (yet).

---

## 🧪 Test the Demos

1. **View blog demo:**
   ```bash
   open blog-install-button.html
   ```

2. **Test shell installer locally:**
   ```bash
   chmod +x install-web.sh
   # Review first, then:
   # ./install-web.sh
   ```

3. **Test NPX locally:**
   ```bash
   node cli/install.js
   ```

Let me know which ones you want to implement first!
