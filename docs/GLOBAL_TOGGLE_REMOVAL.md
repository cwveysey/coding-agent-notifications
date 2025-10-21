# Global Toggle Removal Decision

## Date
2025-10-21

## Decision
Removed the global "Notifications are currently enabled" toggle from the UI to reduce clutter and confusion.

## Rationale
- **Reduces cognitive load**: Users no longer need to understand the relationship between global and per-hook toggles
- **More explicit control**: Each hook has its own toggle - what you see is what you get
- **Cleaner UI**: Removes verbose copy and redundant control
- **Simpler mental model**: No bi-directional sync logic between global and individual toggles

## Trade-offs
- **Lost "kill switch"**: No single toggle to silence all notifications temporarily
  - Users must toggle off individual hooks if they want silence
  - Could add this back later as a "Disable all" button if needed
- **Default state**: All hooks remain enabled by default, user can selectively disable

## Implementation Details

### Removed UI Elements (from `index.html`)
```html
<!-- REMOVED: Global enabled toggle -->
<div class="card">
    <div class="setting-row">
        <div class="setting-label">
            <label for="globalEnabled" id="globalEnabledLabel">Notifications are currently enabled</label>
            <p class="hint" id="globalEnabledHint">To disable notifications, please set this row's toggle to the "off" position.</p>
        </div>
        <input type="checkbox" id="globalEnabled" class="toggle" checked>
    </div>
</div>
```

### Removed JavaScript Logic (from `main.js`)
```javascript
// REMOVED: Global enabled toggle event listener
const globalEnabledToggle = document.getElementById('globalEnabled');
if (globalEnabledToggle) {
    globalEnabledToggle.addEventListener('change', async (e) => {
        const isEnabled = e.target.checked;
        config.global_settings.enabled = isEnabled;

        // Set all hook toggles to match global enabled state
        config.global_settings.event_enabled.notification = isEnabled;
        config.global_settings.event_enabled.stop = isEnabled;
        config.global_settings.event_enabled.post_tool_use = isEnabled;
        config.global_settings.event_enabled.subagent_stop = isEnabled;

        // Update UI toggles
        const notificationEnabled = document.getElementById('notificationEnabled');
        const stopEnabled = document.getElementById('stopEnabled');
        const postToolUseEnabled = document.getElementById('postToolUseEnabled');
        const subagentStopEnabled = document.getElementById('subagentStopEnabled');

        if (notificationEnabled) notificationEnabled.checked = isEnabled;
        if (stopEnabled) stopEnabled.checked = isEnabled;
        if (postToolUseEnabled) postToolUseEnabled.checked = isEnabled;
        if (subagentStopEnabled) subagentStopEnabled.checked = isEnabled;

        try {
            await invoke('set_sounds_enabled', { enabled: isEnabled });
        } catch (error) {
            console.error('Failed to set sounds enabled:', error);
        }
        updateEnabledLabel(isEnabled);
        markChanged();
    });
}

// REMOVED: Auto-enable global when individual hook is enabled
// This logic was in each hook's event listener:
if (e.target.checked && !config.global_settings.enabled) {
    config.global_settings.enabled = true;
    const globalToggle = document.getElementById('globalEnabled');
    if (globalToggle) globalToggle.checked = true;
    updateEnabledLabel(true);
    try {
        await invoke('set_sounds_enabled', { enabled: true });
    } catch (error) {
        console.error('Failed to set sounds enabled:', error);
    }
}

// REMOVED: updateEnabledLabel function
function updateEnabledLabel(enabled) {
    const label = document.getElementById('globalEnabledLabel');
    const hint = document.getElementById('globalEnabledHint');

    if (label) {
        label.textContent = enabled
            ? 'Notifications are currently enabled'
            : 'Notifications are currently disabled';
    }

    if (hint) {
        hint.textContent = enabled
            ? 'To disable notifications, please set this row\'s toggle to the "off" position.'
            : 'To enable notifications, please set this row\'s toggle to the "on" position.';
    }
}

// REMOVED: Global toggle sync in renderGlobalSettings
const enabled = config.global_settings.enabled;
const toggle = document.getElementById('globalEnabled');
if (toggle) {
    toggle.checked = enabled;
}
updateEnabledLabel(enabled);
```

### Backend Compatibility
The backend `config.global_settings.enabled` field is preserved for backward compatibility but is now derived from hook states:
- `enabled = true` if ANY hook is enabled
- `enabled = false` if ALL hooks are disabled

This allows existing configs to load without errors and preserves the ability to restore the global toggle UI in the future if needed.

## Restoration Path
If we want to restore the global toggle functionality:

1. **Add back UI elements** from the HTML snippet above
2. **Restore event listeners** from the JavaScript snippets above
3. **Re-enable bi-directional sync** between global and per-hook toggles
4. **Update `renderGlobalSettings()`** to sync global toggle state
5. **Restore `updateEnabledLabel()`** function

## Related Files
- `config-editor-app/index.html` - UI structure
- `config-editor-app/main.js` - Event listeners and state management
- `config-editor-app/styles.css` - Styling (no changes needed)
- `config/audio-notifier.yaml.example` - Config structure (backend)
