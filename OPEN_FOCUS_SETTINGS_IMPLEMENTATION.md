# Implementation Guide: Open macOS Focus Settings from Tauri App

## Overview

This feature allows a Tauri app to programmatically open macOS System Settings to the Focus settings pane. This is useful when you need users to configure Focus mode permissions for your app's notifications.

## Use Case

When terminal-notifier notifications are suppressed by macOS Focus modes (Do Not Disturb, Work, Sleep, etc.), you need users to add your notification app to the Focus "Allowed Apps" list. This function provides a one-click way to open the correct settings pane.

---

## Implementation

### 1. Backend (Rust) - Tauri Command

Add this to your `src-tauri/src/main.rs`:

```rust
use std::process::Command;

#[tauri::command]
async fn open_focus_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // Use osascript to open Focus settings directly
        // Combine commands in a single script to ensure proper sequencing
        let script = r#"
            tell application "System Settings"
                activate
                delay 0.5
                reveal pane id "com.apple.Focus-Settings.extension"
            end tell
        "#;

        Command::new("osascript")
            .arg("-e")
            .arg(script)
            .spawn()
            .map_err(|e| format!("Failed to open Focus settings: {}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        return Err("Focus settings are only available on macOS".to_string());
    }

    Ok(())
}
```

### 2. Register the Command

In your `main()` function, add `open_focus_settings` to the invoke handler:

```rust
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_focus_settings,
            // ... your other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3. Frontend - Call from JavaScript/TypeScript

In your frontend code (React, Vue, Svelte, etc.):

```javascript
import { invoke } from '@tauri-apps/api/core';

async function openFocusSettings() {
  try {
    await invoke('open_focus_settings');
    console.log('Focus settings opened');
  } catch (error) {
    console.error('Failed to open Focus settings:', error);
  }
}
```

### 4. Example UI Button

```jsx
<button onClick={openFocusSettings}>
  Open Focus Settings
</button>
```

Or with error handling:

```jsx
async function handleOpenFocusSettings() {
  try {
    await invoke('open_focus_settings');
    // Optionally show success message
  } catch (error) {
    alert(`Failed to open Focus settings: ${error}`);
  }
}

<button onClick={handleOpenFocusSettings}>
  Configure Focus Permissions
</button>
```

---

## How It Works

### AppleScript Breakdown

```applescript
tell application "System Settings"
    activate                                        # Brings System Settings to front
    delay 0.5                                       # Waits for window to open
    reveal pane id "com.apple.Focus-Settings.extension"  # Opens Focus pane
end tell
```

**Key Details:**
- `activate` - Launches System Settings or brings it to foreground
- `delay 0.5` - Small pause ensures System Settings window is ready
- `reveal pane id` - Opens specific settings pane by bundle ID
- Pane ID: `com.apple.Focus-Settings.extension` (macOS 13+)

### Why osascript?

- Native macOS automation tool
- No additional dependencies
- Works across all macOS versions that support Focus modes
- More reliable than `open x-apple.systempreferences:` URL scheme

---

## Testing

### Test the Command

```bash
# From terminal, test the AppleScript directly
osascript -e 'tell application "System Settings" to activate'
osascript -e 'tell application "System Settings" to reveal pane id "com.apple.Focus-Settings.extension"'
```

### Test in Development

```bash
# Run your Tauri app in dev mode
npm run tauri:dev

# Click your "Open Focus Settings" button
# Should open System Settings → Focus
```

### Expected Behavior

1. System Settings app launches (or comes to front)
2. Brief pause (0.5s)
3. Focus settings pane opens automatically
4. User sees their Focus modes (Do Not Disturb, Work, Sleep, etc.)

---

## Troubleshooting

### "Failed to open Focus settings" Error

**Possible causes:**
1. Not running on macOS (`#[cfg(target_os = "macos")]` prevents non-Mac execution)
2. System Settings is unresponsive
3. Permissions issue (rare)

**Solutions:**
- Check you're on macOS
- Try closing System Settings first
- Restart if System Settings is frozen

### Pane Doesn't Open (macOS Version Issues)

**macOS 12 and earlier:**
- Focus modes introduced in macOS 12 (Monterey)
- Pane ID might differ on older versions
- For macOS 12: Try `com.apple.preference.notifications`

**macOS 13+ (Ventura and later):**
- Pane ID: `com.apple.Focus-Settings.extension` ✅

### Settings Opens but Wrong Pane

**Debugging:**
```bash
# List all available pane IDs
open -a "System Settings"
# Then check System Preferences → View menu for pane identifiers
```

**Alternative approach (if pane ID changes):**
```rust
// Fallback: Use URL scheme
Command::new("open")
    .arg("x-apple.systempreferences:com.apple.Focus-Settings.extension")
    .spawn()
```

---

## macOS Version Compatibility

| macOS Version | Focus Settings | Pane ID |
|---------------|----------------|---------|
| 12 (Monterey) | ✅ Focus modes introduced | May differ |
| 13 (Ventura)  | ✅ Works perfectly | `com.apple.Focus-Settings.extension` |
| 14 (Sonoma)   | ✅ Works perfectly | `com.apple.Focus-Settings.extension` |
| 15 (Sequoia)  | ✅ Works perfectly | `com.apple.Focus-Settings.extension` |

---

## User Instructions (For Your App's UI)

Example text to show users:

```markdown
To receive notifications when Focus mode is active:

1. Click "Open Focus Settings" below
2. Select the Focus mode you use (e.g., "Do Not Disturb")
3. Click "Allowed Apps"
4. Add "terminal-notifier" to the list
5. Notifications will now work during Focus mode
```

---

## Alternative: Deep Link (URL Scheme)

If you prefer using URL schemes instead of AppleScript:

```rust
#[tauri::command]
async fn open_focus_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("x-apple.systempreferences:com.apple.Focus-Settings.extension")
            .spawn()
            .map_err(|e| format!("Failed to open Focus settings: {}", e))?;
    }

    Ok(())
}
```

**Pros:**
- Simpler, one-line command
- No delay needed

**Cons:**
- Less reliable across macOS versions
- Doesn't always activate the window
- URL scheme format can change

**Recommendation:** Stick with AppleScript for better reliability.

---

## Complete Example

Here's a complete React component example:

```tsx
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

function FocusSettingsButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      await invoke('open_focus_settings');
      console.log('Focus settings opened successfully');
    } catch (err) {
      setError(err as string);
      console.error('Failed to open Focus settings:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {loading ? 'Opening...' : 'Open Focus Settings'}
      </button>

      {error && (
        <p className="text-red-500 mt-2">
          Error: {error}
        </p>
      )}

      <p className="text-sm text-gray-600 mt-2">
        Configure which Focus modes allow notifications
      </p>
    </div>
  );
}

export default FocusSettingsButton;
```

---

## Security Considerations

- ✅ **Safe**: Only opens System Settings, no system modification
- ✅ **No permissions needed**: Standard user can execute
- ✅ **Read-only**: User must manually configure settings
- ✅ **Sandboxed**: Works within Tauri security model

---

## Summary

1. Add `open_focus_settings` Rust function to `main.rs`
2. Register it in `invoke_handler`
3. Call from frontend with `invoke('open_focus_settings')`
4. System Settings opens to Focus pane automatically
5. User configures notification permissions

**Result:** One-click navigation to Focus settings, improving UX when users need to configure notification permissions.
