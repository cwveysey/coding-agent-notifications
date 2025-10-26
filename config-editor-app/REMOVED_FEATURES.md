# Removed Features Documentation

## Per-Project Sound Customization (Removed 2025-10-24)

### What This Feature Was

A system allowing users to configure different sound/event settings per project directory, rather than using global settings for all Claude Code sessions.

### Why It Was Removed

- Premature optimization - solving for a use case that may not exist yet
- Added UI complexity (prototype selector, toggle visibility issues)
- Not core to v1 value proposition: "Get audio alerts when Claude needs you"
- Can be added later if users request it

### What Was Implemented

#### UI Components (in index.html)

1. **Prototype Selector** (lines ~58-68)
   ```html
   <div class="prototype-selector">
       <div class="prototype-label">PROTOTYPE PREVIEW:</div>
       <div class="prototype-buttons">
           <button class="prototype-btn active" data-prototype="2">Prototype A</button>
           <button class="prototype-btn" data-prototype="4">Prototype B</button>
       </div>
   </div>
   ```

2. **Global/Project Toggle** (lines ~106-113 in Prototype 2)
   ```html
   <div class="card" style="margin-bottom: 24px;">
       <div class="setting-row">
           <div class="setting-label">
               <label for="useGlobalSettings">Use the same sound and event settings across all projects</label>
           </div>
           <input type="checkbox" id="useGlobalSettings" class="toggle" checked>
       </div>
   </div>
   ```

3. **Prototype View 2** (lines ~103-209)
   - Simple toggle-based UI
   - `data-prototype-view="2"`
   - `.global-content` div (shown when toggle checked)
   - `.project-content` div (shown when toggle unchecked)
   - Empty state: "+ Customize audio notifications for a new project"
   - Tab-based project selector with dynamic content

4. **Prototype View 4** (lines ~212-331)
   - Alternative UI pattern ("Prototype B")
   - `data-prototype-view="4"`
   - Similar structure with "Alt" suffixed IDs
   - `useGlobalSettingsAlt`, `data-global-content-alt`, etc.

5. **Legacy Global Settings Section** (lines ~353-427)
   - `id="globalSettings"`
   - Hidden by default (`style="display: none"`)
   - Controlled by JavaScript when `globalMode = true`
   - Had its own DND settings duplicate

6. **Per-Project Settings Section** (lines ~429-440)
   - `id="projectSettings"`
   - Hidden by default
   - Info banner: "Notifications will only play for projects you enable below"
   - `id="projectList"` container for dynamic project cards
   - `id="addProjectBtn"` to add new projects

#### JavaScript (in main.js)

**Event Listeners:**
- `useGlobalSettings` toggle handler (line ~circa 200)
- `useGlobalSettingsAlt` toggle handler
- Prototype button click handlers
- Add project button handlers (`addProjectBtnSimple`, `addProjectBtnAlt`, `addProjectBtn`)
- Project-specific sound/event controls

**Functions:**
- `renderProjectTabsSimple()` - render project tabs for Prototype 2
- `renderProjectTabsAlt()` - render project tabs for Prototype 4
- Show/hide logic for `.global-content` vs `.project-content`
- Prototype view switching logic

#### Rust Backend (in main.rs)

**Config Structure:**
```rust
pub struct Config {
    pub global_mode: bool,  // Toggle between global/per-project
    pub global_settings: GlobalSettings,
    pub projects: Vec<ProjectConfig>,  // Per-project settings
    // ...
}

pub struct ProjectConfig {
    pub path: String,
    pub event_sounds: EventSounds,
    pub events_enabled: EventsEnabled,
    // ...
}
```

**Commands:**
- `add_project` - Add new project directory
- `remove_project` - Remove project
- Project path validation

#### CSS (in styles.css)

**Prototype-specific styles:**
- `.prototype-selector` (lines ~791-834)
- `.prototype-label`
- `.prototype-buttons`
- `.prototype-btn`
- `.prototype-view` (lines ~837-839)
- `.global-content` (lines ~1106-1108)
- `.project-content` (lines ~1106-1108)
- Tab-based UI styles for project selection

### How to Restore This Feature

#### Step 1: Restore HTML Structure

1. Add prototype selector back to Claude Code view (after line ~68)
2. Restore both prototype views (2 and 4) with all their content
3. Restore `#globalSettings` and `#projectSettings` sections

**Key files to check:**
- Look at git history before 2025-10-24
- Search for removed: `data-prototype-view`, `useGlobalSettings`, `projectSettings`

#### Step 2: Restore JavaScript

1. Add prototype switching logic back to `main.js`
2. Restore toggle event listeners for `useGlobalSettings` and `useGlobalSettingsAlt`
3. Restore `renderProjectTabsSimple()` and `renderProjectTabsAlt()` functions
4. Add back project add/remove handlers
5. Restore show/hide logic for content sections

#### Step 3: Restore Rust Backend

1. Uncomment/restore `projects` field in `Config` struct
2. Restore `ProjectConfig` struct
3. Add back `add_project` and `remove_project` commands
4. Restore project-specific config loading/saving logic

#### Step 4: Restore CSS

1. Add back prototype selector styles
2. Restore `.global-content` and `.project-content` display logic
3. Add back tab-based UI styles

#### Step 5: Test Thoroughly

**Known issues from development:**
- Toggle visibility bug: toggle was inside `.global-content`, making it disappear when unchecked
  - **Fix:** Move toggle outside both content divs, at settings section level
- Multiple Focus Settings duplicates across views
  - **Fix:** Consolidate to single instance or ensure proper syncing

### Architecture Notes

**Design Pattern:** The feature used a "mode toggle" pattern where:
- Global mode (default): Single set of settings for all projects
- Per-project mode: Tab-based UI with per-project customization

**Why Two Prototypes?**
- Prototype A: Simple, clean toggle UX
- Prototype B: Alternative layout for testing
- Plan was to pick one based on user feedback, but feature was cut before decision

### Backend Config File Structure

When `global_mode = false`, the YAML config included:
```yaml
global_mode: false
global_settings:
  event_sounds:
    notification: "voice:simple"
    # ...
  events_enabled:
    notification: true
    # ...
projects:
  - path: "/Users/username/project1"
    event_sounds:
      notification: "Glass.aiff"
      # ...
    events_enabled:
      notification: true
      # ...
```

### What Stayed (v1 Shipped)

- Global event sound configuration (always active)
- Focus Settings (DND silence audio toggle)
- Audio library with custom upload
- All event types (Notification, Stop, PostToolUse, SubagentStop)
- Collapsible technical details sections

---

## How to Add This Back in v2

1. Read this document
2. Check git history: `git log --all --grep="per-project" --grep="prototype"`
3. Look for commits before 2025-10-24
4. Restore incrementally, testing at each step
5. Consider simplifying to just ONE prototype view, not two
6. Fix the toggle visibility bug from the start
7. Add proper user onboarding for the feature
