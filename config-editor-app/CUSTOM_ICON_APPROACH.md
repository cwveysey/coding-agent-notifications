# Custom Icon Approach for Notifications

## What It Looks Like

Instead of seeing the default terminal-notifier icon (a Terminal icon) in your notifications, you'll see your app's custom icon.

**Current (default terminal-notifier):**
```
┌─────────────────────────────────┐
│ 🖥️ [Terminal Icon]              │
│ Claude finished                  │
│ Project: config-editor-app...    │
└─────────────────────────────────┘
```

**With Custom Icon:**
```
┌─────────────────────────────────┐
│ 🔊 [Your App Icon]              │
│ Claude finished                  │
│ Project: config-editor-app...    │
└─────────────────────────────────┘
```

---

## Two Ways to Add Custom Icons

### Option 1: Per-Notification Icon (Quick & Easy) ⭐

Use terminal-notifier's `-appIcon` parameter:

```bash
terminal-notifier \
    -title "Claude finished" \
    -message "Your message here" \
    -appIcon "$HOME/.claude/icons/app-icon.png"
```

**Implementation:**
1. Copy your app icon to `~/.claude/icons/app-icon.png` during installation
2. Update `smart-notify.sh` to add `-appIcon` parameter

**What changes:**
- Icon next to the notification content
- Still shows "terminal-notifier" as the app name in Notification Center

---

### Option 2: Custom Bundle ID (Professional, More Complex)

Recompile terminal-notifier with your own Bundle ID:

**Steps:**
1. Clone terminal-notifier: `git clone https://github.com/julienXX/terminal-notifier.git`
2. Change Bundle ID in Xcode project to `com.yourcompany.audio-notifier`
3. Add your app icon to the project
4. Compile: `xcodebuild -project Terminal\ Notifier.xcodeproj`
5. Bundle the compiled app with your installer

**What changes:**
- App name in Notification Center shows YOUR app name
- System Preferences shows YOUR app under Notifications
- Users can configure notification settings specifically for your app
- Icon appears in Notification Center and System Preferences

---

## Downsides of Custom Icon Approach

### Option 1 Downsides (Per-Notification Icon):

**Minor:**
- ❌ Still shows "terminal-notifier" as app name in settings
- ❌ Icon file must exist on disk (can't be bundled easily)
- ⚠️ Slightly larger notification command (adds file path parameter)

**Not major issues** - mostly cosmetic

### Option 2 Downsides (Custom Bundle ID):

**Moderate:**
- 🔧 **Requires compilation** - Need Xcode, development knowledge
- 📦 **Larger bundle size** - Must include custom terminal-notifier binary (~5-10MB)
- 🔄 **Maintenance burden** - Need to update when terminal-notifier updates
- ⏱️ **Development time** - 2-4 hours for initial setup
- 🧪 **Testing complexity** - Need to test custom binary on different macOS versions
- 📋 **Signing/notarization** - May need Apple Developer account for distribution

**Tradeoffs:**
- More professional appearance
- Better for commercial/polished products
- Overkill for most users

---

## Recommended Approach

**For your use case: Option 1 (Per-Notification Icon)**

**Why:**
- ✅ Quick to implement (30 min)
- ✅ No compilation required
- ✅ Easy to maintain
- ✅ Users see your icon in notifications
- ✅ Still meets all Core Requirements

**Implementation plan:**
1. Copy app icon to `~/.claude/icons/` during installation
2. Modify `smart-notify.sh` to add `-appIcon` parameter
3. Test with your existing setup

**You get:**
- 80% of the benefit (custom icon in notifications)
- 20% of the effort (simple parameter change)

---

## Implementation Example

### Current code (smart-notify.sh line 147):
```bash
terminal-notifier \
    -title "$display_title" \
    -message "$display_message" \
    >/dev/null 2>&1 &
```

### With custom icon:
```bash
# Check if custom icon exists
CUSTOM_ICON="$HOME/.claude/icons/app-icon.png"
if [[ -f "$CUSTOM_ICON" ]]; then
    terminal-notifier \
        -title "$display_title" \
        -message "$display_message" \
        -appIcon "$CUSTOM_ICON" \
        >/dev/null 2>&1 &
else
    # Fallback to default
    terminal-notifier \
        -title "$display_title" \
        -message "$display_message" \
        >/dev/null 2>&1 &
fi
```

### Installation step (in install_hooks):
```rust
// Copy app icon for notifications
let icons_dir = claude_dir.join("icons");
fs::create_dir_all(&icons_dir)?;

let app_icon_source = resource_dir.join("icons").join("128x128.png");
let app_icon_dest = icons_dir.join("app-icon.png");
fs::copy(&app_icon_source, &app_icon_dest)?;
```

---

## Visual Comparison

### Without Custom Icon
- Generic terminal icon
- Looks technical/developer-focused
- Could be any terminal script

### With Custom Icon (Option 1)
- Your app's icon
- Recognizable brand
- Professional appearance
- Still says "terminal-notifier" in settings

### With Custom Bundle ID (Option 2)
- Your app's icon everywhere
- Your app name in settings
- Dedicated notification preferences
- Most professional, but most complex

---

## Bottom Line

**Start with Option 1** - it's easy, fast, and good enough.

Only do Option 2 if:
- You're distributing commercially
- Brand consistency is critical
- You have Xcode/development experience
- You're okay with maintenance overhead

**For 99% of users, Option 1 is the right choice.**
