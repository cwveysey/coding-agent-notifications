# Blog Deployment Guide

## ✅ What's Ready

You now have **two installation methods** ready to share on your blog:

### 🖥️ **Option 1: Terminal (1 command)**
```bash
curl -fsSL https://www.cooperveysey.com/install.sh | bash
```

### 🖱️ **Option 2: GUI Installer**
Download PKG → Install → Auto-configures

---

## 📝 Blog Page Setup

### 1. Upload the install script to Vercel

Put `install-web.sh` in your Vercel project's `public/` folder as `install.sh`:

```
your-blog/
  public/
    install.sh  ← Copy install-web.sh here
```

It will be accessible at: `https://www.cooperveysey.com/install.sh`

---

### 2. Create your blog post

Use the content from `blog-install-button.html` or write your own with both options:

**Example blog content:**

```markdown
# Audio Notifications for Claude Code

Never miss when Claude needs your input.

## Installation

Choose your preferred method:

### Terminal (Fastest)

```bash
curl -fsSL https://www.cooperveysey.com/install.sh | bash
```

Installs everything in one command.

### GUI Download

[Download for macOS](https://github.com/cooperveysey/audio-notifications-for-claude-code-activity/releases/latest)

Download → Open → Auto-installs

---

## What it does

- Audio alerts for Claude Code events
- Customizable sounds
- AI-generated voice notifications
- Respects macOS Focus modes
```

---

## 🚀 Deployment Checklist

### Before Launch:

- [ ] Build the PKG: `cd config-editor-app && npm run tauri build`
- [ ] Create GitHub release with the PKG file
- [ ] Upload `install-web.sh` to Vercel as `public/install.sh`
- [ ] Test install script: `curl -fsSL https://www.cooperveysey.com/install.sh | bash`
- [ ] Test PKG download and installation

### Optional:

- [ ] Set up analytics tracking on download button
- [ ] Add screenshots to blog post
- [ ] Create video demo

---

## 📊 Expected User Flows

### Terminal User Flow:
1. Copy command from blog
2. Paste in terminal
3. Press Enter
4. **DONE** ✅

**Total: 1 command**

### GUI User Flow:
1. Click "Download for macOS"
2. Double-click downloaded PKG
3. Click "Install" in installer
4. macOS security prompt (if unsigned) → Allow
5. **Auto-configures** ✅
6. App opens automatically
7. Configure settings (optional)

**Total: 3-4 clicks** (Native macOS installer experience)

---

## 🎯 What Changed

1. **App now auto-installs** on first launch (no manual button)
2. **FAQ updated** to say "Automated installation" instead of "One-click"
3. **Blog URLs** updated to use your actual domains
4. **Install script** points to your GitHub repo

---

## 🧪 Testing

Test the full flow:

1. **Test auto-install:**
   - Click dev reset button
   - App should show "Installing..." spinner
   - Should auto-complete and show success toast

2. **Test shell script locally:**
   ```bash
   # Review first
   cat install-web.sh

   # Test (WARNING: Will modify your ~/.claude/)
   # ./install-web.sh
   ```

---

## 📱 Where to Host

Your blog page can be at:
- `https://www.cooperveysey.com/blog/claude-audio-notifications`
- `https://www.youcanjustbuildthings.dev/blog/claude-audio-notifications`

Both work since they're on the same Vercel project!

---

## 🎨 Blog Page Examples

Check out `blog-install-button.html` for a beautiful tabbed interface showing all options.

Or keep it simple with just two buttons:

```html
<div class="install-options">
  <div class="option">
    <h3>Terminal</h3>
    <code>curl -fsSL https://www.cooperveysey.com/install.sh | bash</code>
    <button onclick="copyToClipboard('curl...')">Copy</button>
  </div>

  <div class="option">
    <h3>Download</h3>
    <a href="https://github.com/cooperveysey/audio-notifications-for-claude-code-activity/releases/latest">
      Download for macOS
    </a>
  </div>
</div>
```

---

## ✅ You're Ready!

The app now:
- ✅ Auto-installs on first launch
- ✅ Shows elegant loading spinner
- ✅ Has updated FAQ copy
- ✅ Works with your domains

Upload `install.sh` to Vercel and you're good to go! 🚀
