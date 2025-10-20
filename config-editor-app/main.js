import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';

// State
let config = null;
let hasChanges = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    setupEventListeners();
    renderUI();
    setupBackToTop();
});

// ===== Config Management =====

async function loadConfig() {
    try {
        config = await invoke('load_config');
        hasChanges = false;
        updateSaveButton();
        console.log('Config loaded:', config);
        console.log('Sound library:', config.sound_library);
        console.log('Event sounds:', config.global_settings.event_sounds);
    } catch (error) {
        console.error('Failed to load config:', error);
        // Use default config if loading fails
        config = {
            global_mode: true,
            global_settings: {
                enabled: true,
                event_sounds: {
                    notification: '/System/Library/Sounds/Glass.aiff',
                    stop: '/System/Library/Sounds/Glass.aiff',
                    post_tool_use: '/System/Library/Sounds/Glass.aiff',
                    subagent_stop: '/System/Library/Sounds/Glass.aiff'
                },
                event_enabled: {
                    notification: true,
                    stop: true,
                    post_tool_use: true,
                    subagent_stop: true
                }
            },
            projects: [],
            sound_library: [
                '/System/Library/Sounds/Ping.aiff',
                '/System/Library/Sounds/Glass.aiff',
                '/System/Library/Sounds/Hero.aiff',
                '/System/Library/Sounds/Submarine.aiff',
                '/System/Library/Sounds/Tink.aiff',
                '/System/Library/Sounds/Pop.aiff',
                '/System/Library/Sounds/Funk.aiff',
                '/System/Library/Sounds/Purr.aiff',
                '/System/Library/Sounds/Blow.aiff',
                '/System/Library/Sounds/Bottle.aiff',
                '/System/Library/Sounds/Frog.aiff',
                '/System/Library/Sounds/Basso.aiff'
            ],
            min_interval: 2,
            debug: false
        };
    }
}

async function saveConfig() {
    try {
        await invoke('save_config', { config });
        hasChanges = false;
        updateSaveButton();
        showToast('Settings saved successfully');
    } catch (error) {
        console.error('Failed to save config:', error);
        showToast('Failed to save configuration', 'error');
    }
}

function markChanged() {
    hasChanges = true;
    updateSaveButton();
}

function updateSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = !hasChanges;
}

// ===== Event Listeners =====

function setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveConfig);

    // Global mode toggle
    document.getElementById('globalMode').addEventListener('change', (e) => {
        config.global_mode = e.target.checked;
        markChanged();
        renderUI();
    });

    // Global settings
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

    document.getElementById('notificationSound').addEventListener('change', (e) => {
        if (config.global_mode) {
            config.global_settings.event_sounds.notification = e.target.value;
        }
        markChanged();
    });

    document.getElementById('stopSound').addEventListener('change', (e) => {
        if (config.global_mode) {
            config.global_settings.event_sounds.stop = e.target.value;
        }
        markChanged();
    });

    document.getElementById('postToolUseSound').addEventListener('change', (e) => {
        if (config.global_mode) {
            config.global_settings.event_sounds.post_tool_use = e.target.value;
        }
        markChanged();
    });

    document.getElementById('subagentStopSound').addEventListener('change', (e) => {
        if (config.global_mode) {
            config.global_settings.event_sounds.subagent_stop = e.target.value;
        }
        markChanged();
    });

    // Event enabled toggles
    document.getElementById('notificationEnabled').addEventListener('change', (e) => {
        if (config.global_mode) {
            config.global_settings.event_enabled.notification = e.target.checked;
        }
        markChanged();
    });

    document.getElementById('stopEnabled').addEventListener('change', (e) => {
        if (config.global_mode) {
            config.global_settings.event_enabled.stop = e.target.checked;
        }
        markChanged();
    });

    document.getElementById('postToolUseEnabled').addEventListener('change', (e) => {
        if (config.global_mode) {
            config.global_settings.event_enabled.post_tool_use = e.target.checked;
        }
        markChanged();
    });

    document.getElementById('subagentStopEnabled').addEventListener('change', (e) => {
        if (config.global_mode) {
            config.global_settings.event_enabled.subagent_stop = e.target.checked;
        }
        markChanged();
    });

    // Sound preview buttons
    document.querySelectorAll('.btn-play').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const soundType = e.target.dataset.sound;
            const soundMap = {
                'notification': 'notificationSound',
                'stop': 'stopSound',
                'postToolUse': 'postToolUseSound',
                'subagentStop': 'subagentStopSound'
            };

            const selectId = soundMap[soundType];
            if (selectId) {
                const soundPath = document.getElementById(selectId).value;
                if (soundPath) {
                    await invoke('preview_sound', { soundPath });
                }
            }
        });
    });

    // Documentation button
    document.getElementById('openDocsBtn').addEventListener('click', async () => {
        await openUrl('https://docs.claude.com/en/docs/claude-code/hooks-guide#hook-events-overview');
    });

    // Handle all inline link clicks to open in browser
    document.querySelectorAll('.inline-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = e.target.getAttribute('href');
            if (url) {
                await openUrl(url);
            }
        });
    });

    // Add project button
    document.getElementById('addProjectBtn').addEventListener('click', async () => {
        const selected = await openDialog({
            directory: true,
            multiple: false,
            title: 'Select Project Directory',
        });

        if (selected) {
            const newProject = {
                path: selected,
                enabled: true,
                event_sounds: {
                    notification: '/System/Library/Sounds/Glass.aiff',
                    stop: '/System/Library/Sounds/Glass.aiff',
                    post_tool_use: '/System/Library/Sounds/Glass.aiff',
                    subagent_stop: '/System/Library/Sounds/Glass.aiff',
                },
                event_enabled: {
                    notification: true,
                    stop: true,
                    post_tool_use: true,
                    subagent_stop: true,
                },
            };
            config.projects.push(newProject);
            markChanged();
            renderProjectList();
        }
    });

    // Upload sound button
    document.getElementById('uploadSoundBtn').addEventListener('click', async () => {
        const selected = await openDialog({
            multiple: false,
            filters: [{
                name: 'Audio Files',
                extensions: ['aiff', 'wav', 'mp3']
            }],
            title: 'Select Sound File',
        });

        if (selected) {
            config.sound_library.push(selected);
            markChanged();
            renderSoundLibrary();
            populateSoundSelectors();
        }
    });

}

// ===== Rendering =====

function renderUI() {
    const globalMode = config.global_mode;

    // Update global mode toggle
    document.getElementById('globalMode').checked = globalMode;

    // Show/hide sections
    document.getElementById('globalSettings').style.display = globalMode ? 'block' : 'none';
    document.getElementById('projectSettings').style.display = globalMode ? 'none' : 'block';

    // Render components
    if (globalMode) {
        renderGlobalSettings();
    } else {
        renderProjectList();
    }

    renderSoundLibrary();

    // Populate all sound selectors
    populateSoundSelectors();
}

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

function renderGlobalSettings() {
    if (!config || !config.global_settings) {
        console.error('Config not loaded properly');
        return;
    }

    const enabled = config.global_settings.enabled;
    const toggle = document.getElementById('globalEnabled');
    if (toggle) {
        toggle.checked = enabled;
    }
    updateEnabledLabel(enabled);

    const notificationSound = document.getElementById('notificationSound');
    const stopSound = document.getElementById('stopSound');
    const postToolUseSound = document.getElementById('postToolUseSound');
    const subagentStopSound = document.getElementById('subagentStopSound');

    if (notificationSound) notificationSound.value = config.global_settings.event_sounds.notification;
    if (stopSound) stopSound.value = config.global_settings.event_sounds.stop;
    if (postToolUseSound) postToolUseSound.value = config.global_settings.event_sounds.post_tool_use;
    if (subagentStopSound) subagentStopSound.value = config.global_settings.event_sounds.subagent_stop;

    // Set event enabled toggles
    const notificationEnabled = document.getElementById('notificationEnabled');
    const stopEnabled = document.getElementById('stopEnabled');
    const postToolUseEnabled = document.getElementById('postToolUseEnabled');
    const subagentStopEnabled = document.getElementById('subagentStopEnabled');

    if (config.global_settings.event_enabled) {
        if (notificationEnabled) notificationEnabled.checked = config.global_settings.event_enabled.notification;
        if (stopEnabled) stopEnabled.checked = config.global_settings.event_enabled.stop;
        if (postToolUseEnabled) postToolUseEnabled.checked = config.global_settings.event_enabled.post_tool_use;
        if (subagentStopEnabled) subagentStopEnabled.checked = config.global_settings.event_enabled.subagent_stop;
    }
}

function renderProjectList() {
    const projectList = document.getElementById('projectList');
    projectList.innerHTML = '';

    if (config.projects.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'info-banner';
        emptyState.style.opacity = '0.7';
        emptyState.textContent = 'No projects configured. Click "+ Add Project" to get started.';
        projectList.appendChild(emptyState);
        return;
    }

    config.projects.forEach((project, index) => {
        const card = document.createElement('div');
        card.className = 'project-card';

        card.innerHTML = `
            <div class="project-header">
                <div class="project-path" title="${project.path}">${project.path}</div>
                <input type="checkbox" class="toggle" ${project.enabled ? 'checked' : ''} data-index="${index}">
            </div>
            <div class="project-sounds">
                <div class="project-sound-row">
                    <span class="project-sound-label">Notification</span>
                    <div class="sound-control">
                        <select class="sound-select" data-index="${index}" data-event="notification"></select>
                        <button class="btn-play" data-index="${index}" data-event="notification">▶</button>
                    </div>
                </div>
                <div class="project-sound-row">
                    <span class="project-sound-label">Stop</span>
                    <div class="sound-control">
                        <select class="sound-select" data-index="${index}" data-event="stop"></select>
                        <button class="btn-play" data-index="${index}" data-event="stop">▶</button>
                    </div>
                </div>
                <div class="project-sound-row">
                    <span class="project-sound-label">PostToolUse</span>
                    <div class="sound-control">
                        <select class="sound-select" data-index="${index}" data-event="post_tool_use"></select>
                        <button class="btn-play" data-index="${index}" data-event="post_tool_use">▶</button>
                    </div>
                </div>
                <div class="project-sound-row">
                    <span class="project-sound-label">SubagentStop</span>
                    <div class="sound-control">
                        <select class="sound-select" data-index="${index}" data-event="subagent_stop"></select>
                        <button class="btn-play" data-index="${index}" data-event="subagent_stop">▶</button>
                    </div>
                </div>
            </div>
            <button class="btn-remove" data-index="${index}">Remove Project</button>
        `;

        projectList.appendChild(card);

        // Add event listeners for this project
        const toggle = card.querySelector('.toggle');
        toggle.addEventListener('change', (e) => {
            config.projects[index].enabled = e.target.checked;
            markChanged();
        });

        const selects = card.querySelectorAll('.sound-select');
        selects.forEach(select => {
            const event = select.dataset.event;
            populateSoundSelector(select, config.sound_library);
            select.value = project.event_sounds[event];

            select.addEventListener('change', (e) => {
                config.projects[index].event_sounds[event] = e.target.value;
                markChanged();
            });
        });

        const playBtns = card.querySelectorAll('.btn-play');
        playBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const event = e.target.dataset.event;
                const soundPath = project.event_sounds[event];
                await invoke('preview_sound', { soundPath });
            });
        });

        const removeBtn = card.querySelector('.btn-remove');
        removeBtn.addEventListener('click', () => {
            config.projects.splice(index, 1);
            markChanged();
            renderProjectList();
        });
    });
}

function renderSoundLibrary() {
    // Only show custom sounds (system sounds accessible via dropdowns)
    const customSounds = config.sound_library.filter(path => !path.includes('/System/Library/Sounds/'));

    // Render custom sounds
    const customSoundsContainer = document.getElementById('customSounds');
    customSoundsContainer.innerHTML = '';

    if (customSounds.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'hint';
        emptyState.style.padding = '12px 0';
        emptyState.textContent = 'No custom sounds added yet.';
        customSoundsContainer.appendChild(emptyState);
    } else {
        customSounds.forEach((soundPath) => {
            const item = createSoundItem(soundPath, true);
            customSoundsContainer.appendChild(item);
        });
    }
}

function createSoundItem(soundPath, canRemove) {
    const item = document.createElement('div');
    item.className = 'sound-item';

    const name = soundPath.split('/').pop();

    item.innerHTML = `
        <span class="sound-name" title="${soundPath}">${name}</span>
        <div class="sound-actions">
            <button class="btn-icon btn-play-library" data-path="${soundPath}">▶</button>
            ${canRemove ? `<button class="btn-icon btn-remove-sound" data-path="${soundPath}">×</button>` : ''}
        </div>
    `;

    // Event listeners
    const playBtn = item.querySelector('.btn-play-library');
    playBtn.addEventListener('click', async () => {
        await invoke('preview_sound', { soundPath });
    });

    const removeBtn = item.querySelector('.btn-remove-sound');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const index = config.sound_library.indexOf(soundPath);
            if (index > -1) {
                config.sound_library.splice(index, 1);
                markChanged();
                renderSoundLibrary();
                populateSoundSelectors();
            }
        });
    }

    return item;
}

// ===== Sound Selectors =====

function populateSoundSelectors() {
    const selectors = [
        'notificationSound',
        'stopSound',
        'postToolUseSound',
        'subagentStopSound'
    ];

    selectors.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            populateSoundSelector(select, config.sound_library);
        }
    });

    // Set current values
    if (config.global_mode) {
        const notificationSelect = document.getElementById('notificationSound');
        const stopSelect = document.getElementById('stopSound');
        const postToolUseSelect = document.getElementById('postToolUseSound');
        const subagentStopSelect = document.getElementById('subagentStopSound');

        if (notificationSelect) notificationSelect.value = config.global_settings.event_sounds.notification;
        if (stopSelect) stopSelect.value = config.global_settings.event_sounds.stop;
        if (postToolUseSelect) postToolUseSelect.value = config.global_settings.event_sounds.post_tool_use;
        if (subagentStopSelect) subagentStopSelect.value = config.global_settings.event_sounds.subagent_stop;
    }
}

function populateSoundSelector(select, sounds) {
    if (!select) {
        console.error('Invalid select:', select);
        return;
    }

    if (!sounds || sounds.length === 0) {
        console.error('No sounds available:', sounds);
        return;
    }

    select.innerHTML = '';

    sounds.forEach(soundPath => {
        const option = document.createElement('option');
        option.value = soundPath;
        option.textContent = soundPath.split('/').pop().replace(/\.(aiff|wav|mp3)$/, '');
        select.appendChild(option);
    });

    console.log('Populated selector', select.id, 'with', sounds.length, 'sounds');
}

// ===== Toast Notifications =====

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('visible'), 10);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Back to Top Button =====

function setupBackToTop() {
    // Create back to top button
    const backToTop = document.createElement('button');
    backToTop.className = 'back-to-top';
    backToTop.textContent = '↑';
    backToTop.title = 'Back to top';
    document.body.appendChild(backToTop);

    // Show/hide based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    // Scroll to top on click
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
