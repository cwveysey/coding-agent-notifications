import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { getCurrentWindow } from '@tauri-apps/api/window';

// State
let config = null;
let savedConfig = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await checkInstallation();
    setupEventListeners();
    setupCloseHandler();
    renderUI();
});

// Check if installation is needed and auto-install
async function checkInstallation() {
    try {
        // Check if scripts are installed
        const soundsEnabled = await invoke('get_sounds_enabled');

        if (!soundsEnabled) {
            // Auto-install on first launch
            const installSection = document.getElementById('installSection');
            if (installSection) {
                installSection.style.display = 'block';
            }

            // Start installation automatically
            try {
                console.log('Auto-installing on first launch...');
                const result = await invoke('install_hooks');
                console.log('Installation result:', result);

                // Hide install section
                if (installSection) {
                    installSection.style.display = 'none';
                }

                // Show success message
                showToast('Installation complete - you will now receive audio notifications for designated events.', 'success');

                // Reload config to pick up new default config
                await loadConfig();
                renderUI();
            } catch (error) {
                console.error('Auto-installation failed:', error);
                showToast('Installation failed: ' + error, 'error');
            }
        }
    } catch (error) {
        console.error('Failed to check installation status:', error);
    }
}

// ===== Config Management =====

async function loadConfig() {
    try {
        config = await invoke('load_config');
        savedConfig = JSON.parse(JSON.stringify(config)); // Deep copy
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
                    notification: 'voice:simple',
                    stop: 'voice:simple',
                    pre_tool_use: 'voice:simple',
                    post_tool_use: 'voice:simple',
                    subagent_stop: 'voice:simple'
                },
                event_enabled: {
                    notification: true,
                    stop: true,
                    pre_tool_use: true,
                    post_tool_use: true,
                    subagent_stop: true
                },
                voice_enabled: {
                    notification: false,
                    stop: false,
                    pre_tool_use: false,
                    post_tool_use: false,
                    subagent_stop: false
                },
                voice_template: '{event} event',
                voice_provider: 'system',
                voice_id: null,
                fish_audio_api_key: null,
                respect_do_not_disturb: false
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
        savedConfig = JSON.parse(JSON.stringify(config)); // Deep copy
    }
}

async function saveConfig() {
    try {
        // Derive global enabled state from individual hook states (for backend compatibility)
        const anyHookEnabled =
            config.global_settings.event_enabled.notification ||
            config.global_settings.event_enabled.stop ||
            config.global_settings.event_enabled.pre_tool_use ||
            config.global_settings.event_enabled.post_tool_use ||
            config.global_settings.event_enabled.subagent_stop;
        config.global_settings.enabled = anyHookEnabled;

        // Check if we need to generate project-specific voice files
        // (only when "voice:project" is selected, not for simple voice)
        const needsProjectVoice =
            config.global_settings.event_sounds.notification === 'voice:project' ||
            config.global_settings.event_sounds.stop === 'voice:project' ||
            config.global_settings.event_sounds.pre_tool_use === 'voice:project' ||
            config.global_settings.event_sounds.post_tool_use === 'voice:project' ||
            config.global_settings.event_sounds.subagent_stop === 'voice:project' ||
            config.projects.some(p =>
                p.event_sounds.notification === 'voice:project' ||
                p.event_sounds.stop === 'voice:project' ||
                p.event_sounds.pre_tool_use === 'voice:project' ||
                p.event_sounds.post_tool_use === 'voice:project' ||
                p.event_sounds.subagent_stop === 'voice:project'
            );

        // Convert voice options to actual config before saving
        processVoiceSelections(config);

        await invoke('save_config', { config });

        // Only generate voice files if project-specific voice is selected
        // Global "simple" voice files are generated once and reused
        if (needsProjectVoice) {
            showToast('Generating voice notifications...');
            try {
                const result = await invoke('generate_voice_notifications', {
                    config,
                    apiKey: null // TODO: Get from settings
                });
                console.log(result);
                showToast('Settings saved successfully');
            } catch (voiceError) {
                console.error('Failed to generate voice notifications:', voiceError);
                showToast('Saved, but voice generation failed: ' + voiceError, 'error');
                return; // Don't update savedConfig if generation failed
            }
        }

        savedConfig = JSON.parse(JSON.stringify(config)); // Update saved state
        updateSaveButton();
        showToast('Settings saved successfully');
    } catch (error) {
        console.error('Failed to save config:', error);
        showToast('Failed to save configuration', 'error');
    }
}

function processVoiceSelections(config) {
    // Convert voice selections to voice_enabled flags and update templates
    const events = ['notification', 'stop', 'pre_tool_use', 'post_tool_use', 'subagent_stop'];

    // Process global settings
    events.forEach(event => {
        const value = config.global_settings.event_sounds[event];
        if (value?.startsWith('voice:')) {
            config.global_settings.voice_enabled[event] = true;
            if (value === 'voice:simple') {
                config.global_settings.voice_template = '{event} event';
            } else if (value === 'voice:project') {
                config.global_settings.voice_template = 'The {event} event was run for the {project} project';
            }
            // Reset to a default sound file (voice will override)
            config.global_settings.event_sounds[event] = '/System/Library/Sounds/Glass.aiff';
        } else {
            config.global_settings.voice_enabled[event] = false;
        }
    });

    // Process projects
    config.projects.forEach(project => {
        events.forEach(event => {
            const value = project.event_sounds[event];
            if (value?.startsWith('voice:')) {
                project.voice_enabled[event] = true;
                // Reset to a default sound file
                project.event_sounds[event] = '/System/Library/Sounds/Glass.aiff';
            } else {
                project.voice_enabled[event] = false;
            }
        });
    });
}

function markChanged() {
    updateSaveButton();
}

function hasUnsavedChanges() {
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
}

function updateSaveButton() {
    const hasChanges = hasUnsavedChanges();

    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.disabled = !hasChanges;
    }
}

// ===== Close Handler =====

async function setupCloseHandler() {
    const appWindow = getCurrentWindow();

    await appWindow.onCloseRequested(async (event) => {
        if (hasUnsavedChanges()) {
            const confirmed = confirm('You have unsaved changes. Are you sure you want to exit without saving?');
            if (!confirmed) {
                event.preventDefault();
            }
        }
    });
}

// ===== Event Listeners =====

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.addEventListener('click', (e) => {
            const targetView = e.target.dataset.view;

            // Update navigation active state
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            e.target.classList.add('active');

            // Update view visibility
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
                view.style.display = 'none';
            });
            const activeView = document.querySelector(`.view[data-view="${targetView}"]`);
            activeView.classList.add('active');
            activeView.style.display = 'block';

            // Show/hide Save button based on view
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) {
                saveBtn.style.display = targetView === 'claude-code' ? 'block' : 'none';
            }
        });
    });

    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveConfig);

    document.getElementById('notificationSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.notification = e.target.value;
        markChanged();
    });

    document.getElementById('stopSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.stop = e.target.value;
        markChanged();
    });

    document.getElementById('preToolUseSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.pre_tool_use = e.target.value;
        markChanged();
    });

    document.getElementById('postToolUseSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.post_tool_use = e.target.value;
        markChanged();
    });

    document.getElementById('subagentStopSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.subagent_stop = e.target.value;
        markChanged();
    });

    // Event enabled toggles
    document.getElementById('notificationEnabled').addEventListener('change', (e) => {
        config.global_settings.event_enabled.notification = e.target.checked;
        markChanged();
    });

    document.getElementById('stopEnabled').addEventListener('change', (e) => {
        config.global_settings.event_enabled.stop = e.target.checked;
        markChanged();
    });

    document.getElementById('preToolUseEnabled').addEventListener('change', (e) => {
        config.global_settings.event_enabled.pre_tool_use = e.target.checked;
        markChanged();
    });

    document.getElementById('postToolUseEnabled').addEventListener('change', (e) => {
        config.global_settings.event_enabled.post_tool_use = e.target.checked;
        markChanged();
    });

    document.getElementById('subagentStopEnabled').addEventListener('change', (e) => {
        config.global_settings.event_enabled.subagent_stop = e.target.checked;
        markChanged();
    });

    // Respect Do Not Disturb toggle
    document.getElementById('respectDND').addEventListener('change', (e) => {
        config.global_settings.respect_do_not_disturb = e.target.checked;
        markChanged();
    });

    // Sound preview buttons
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-play')) {
            const soundType = e.target.dataset.sound;

            // Map sound type to select element ID
            const soundMap = {
                'notification': 'notificationSound',
                'stop': 'stopSound',
                'preToolUse': 'preToolUseSound',
                'postToolUse': 'postToolUseSound',
                'subagentStop': 'subagentStopSound'
            };

            const selectId = soundMap[soundType];
            if (selectId) {
                const soundSelect = document.getElementById(selectId);
                if (soundSelect && soundSelect.value) {
                    // Check if it's a voice option
                    if (soundSelect.value.startsWith('voice:')) {
                        // Generate and preview voice
                        const eventText = soundType === 'notification' ? 'notification' :
                                        soundType === 'stop' ? 'stop' :
                                        soundType === 'preToolUse' ? 'pre tool use' :
                                        soundType === 'postToolUse' ? 'post tool use' :
                                        soundType === 'subagentStop' ? 'subagent stop' : 'event';

                        const text = `${eventText} event`;

                        try {
                            await invoke('preview_voice', {
                                text,
                                apiKey: config.global_settings.fish_audio_api_key
                            });
                        } catch (error) {
                            console.error('Failed to preview voice:', error);
                            showToast('Voice preview failed: ' + error, 'error');
                        }
                    } else {
                        // Regular sound file
                        try {
                            await invoke('preview_sound', { soundPath: soundSelect.value });
                        } catch (error) {
                            console.error('Failed to preview sound:', error);
                        }
                    }
                }
            }
        }
    });

    // Documentation button (if it exists)
    const openDocsBtn = document.getElementById('openDocsBtn');
    if (openDocsBtn) {
        openDocsBtn.addEventListener('click', async () => {
            await openUrl('https://docs.claude.com/en/docs/claude-code/hooks-guide#hook-events-overview');
        });
    }

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
            try {
                // Copy the file to permanent storage and get the new path
                const permanentPath = await invoke('upload_sound', { sourcePath: selected });
                config.sound_library.push(permanentPath);
                markChanged();
                renderSoundLibrary();
                populateSoundSelectors();
                showToast('Audio file added successfully');
            } catch (error) {
                console.error('Failed to upload sound:', error);
                showToast('Failed to upload audio file: ' + error);
            }
        }
    });

    // Note: Installation now happens automatically on first launch
    // No manual install button needed

    // Dev reset button (temporary for testing)
    const devResetBtn = document.getElementById('devResetBtn');
    if (devResetBtn) {
        devResetBtn.addEventListener('click', async () => {
            if (!confirm('This will delete all installed files and reset to fresh install state. Continue?')) {
                return;
            }

            devResetBtn.disabled = true;
            devResetBtn.textContent = 'Resetting...';

            try {
                await invoke('dev_reset_install');
                showToast('Reset complete! Reloading...', 'success');

                // Reload the app after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } catch (error) {
                console.error('Reset failed:', error);
                showToast('Reset failed: ' + error, 'error');
                devResetBtn.disabled = false;
                devResetBtn.textContent = 'Reset to Fresh Install';
            }
        });
    }

}

// ===== Rendering =====

function renderUI() {
    // Populate all sound selectors
    populateSoundSelectors();

    // Render global settings
    renderGlobalSettings();

    renderSoundLibrary();
}

function renderGlobalSettings() {
    if (!config || !config.global_settings) {
        console.error('Config not loaded properly');
        return;
    }

    const notificationSound = document.getElementById('notificationSound');
    const stopSound = document.getElementById('stopSound');
    const preToolUseSound = document.getElementById('preToolUseSound');
    const postToolUseSound = document.getElementById('postToolUseSound');
    const subagentStopSound = document.getElementById('subagentStopSound');

    // Set values, using voice options if voice is enabled
    if (notificationSound) {
        notificationSound.value = config.global_settings.voice_enabled?.notification
            ? getVoiceOptionValue(config.global_settings.voice_template)
            : config.global_settings.event_sounds.notification;
    }
    if (stopSound) {
        stopSound.value = config.global_settings.voice_enabled?.stop
            ? getVoiceOptionValue(config.global_settings.voice_template)
            : config.global_settings.event_sounds.stop;
    }
    if (preToolUseSound) {
        preToolUseSound.value = config.global_settings.voice_enabled?.pre_tool_use
            ? getVoiceOptionValue(config.global_settings.voice_template)
            : config.global_settings.event_sounds.pre_tool_use;
    }
    if (postToolUseSound) {
        postToolUseSound.value = config.global_settings.voice_enabled?.post_tool_use
            ? getVoiceOptionValue(config.global_settings.voice_template)
            : config.global_settings.event_sounds.post_tool_use;
    }
    if (subagentStopSound) {
        subagentStopSound.value = config.global_settings.voice_enabled?.subagent_stop
            ? getVoiceOptionValue(config.global_settings.voice_template)
            : config.global_settings.event_sounds.subagent_stop;
    }

    // Set event enabled toggles
    const notificationEnabled = document.getElementById('notificationEnabled');
    const stopEnabled = document.getElementById('stopEnabled');
    const preToolUseEnabled = document.getElementById('preToolUseEnabled');
    const postToolUseEnabled = document.getElementById('postToolUseEnabled');
    const subagentStopEnabled = document.getElementById('subagentStopEnabled');

    if (config.global_settings.event_enabled) {
        if (notificationEnabled) notificationEnabled.checked = config.global_settings.event_enabled.notification;
        if (stopEnabled) stopEnabled.checked = config.global_settings.event_enabled.stop;
        if (preToolUseEnabled) preToolUseEnabled.checked = config.global_settings.event_enabled.pre_tool_use;
        if (postToolUseEnabled) postToolUseEnabled.checked = config.global_settings.event_enabled.post_tool_use;
        if (subagentStopEnabled) subagentStopEnabled.checked = config.global_settings.event_enabled.subagent_stop;
    }

    // Set respect_do_not_disturb toggle
    const respectDND = document.getElementById('respectDND');
    if (respectDND) {
        respectDND.checked = config.global_settings.respect_do_not_disturb || false;
    }
}

function getVoiceOptionValue(template) {
    if (template === '{event} event') {
        return 'voice:simple';
    } else if (template.includes('{project}')) {
        return 'voice:project';
    }
    return 'voice:simple'; // default
}

function renderProjectList(containerId = 'projectList', addButtonId = 'addProjectBtn') {
    const projectList = document.getElementById(containerId);
    if (!projectList) return;

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
                    <span class="project-sound-label">PreToolUse</span>
                    <div class="sound-control">
                        <select class="sound-select" data-index="${index}" data-event="pre_tool_use"></select>
                        <button class="btn-play" data-index="${index}" data-event="pre_tool_use">▶</button>
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
            renderProjectList(containerId, addButtonId);
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
        emptyState.textContent = 'No custom audio has been added yet.';
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
        'preToolUseSound',
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
    const notificationSelect = document.getElementById('notificationSound');
    const stopSelect = document.getElementById('stopSound');
    const preToolUseSelect = document.getElementById('preToolUseSound');
    const postToolUseSelect = document.getElementById('postToolUseSound');
    const subagentStopSelect = document.getElementById('subagentStopSound');

    if (notificationSelect) notificationSelect.value = config.global_settings.event_sounds.notification;
    if (stopSelect) stopSelect.value = config.global_settings.event_sounds.stop;
    if (preToolUseSelect) preToolUseSelect.value = config.global_settings.event_sounds.pre_tool_use;
    if (postToolUseSelect) postToolUseSelect.value = config.global_settings.event_sounds.post_tool_use;
    if (subagentStopSelect) subagentStopSelect.value = config.global_settings.event_sounds.subagent_stop;
}

function populateSoundSelector(select, sounds, includeVoiceOptions = true) {
    if (!select) {
        console.error('Invalid select:', select);
        return;
    }

    if (!sounds || sounds.length === 0) {
        console.error('No sounds available:', sounds);
        return;
    }

    select.innerHTML = '';

    // Add voice options at the top
    if (includeVoiceOptions) {
        const voiceGroup = document.createElement('optgroup');
        voiceGroup.label = 'Human voice';

        const voiceSimple = document.createElement('option');
        voiceSimple.value = 'voice:simple';
        voiceSimple.textContent = 'Human voice';
        voiceGroup.appendChild(voiceSimple);

        select.appendChild(voiceGroup);
    }

    // Sort sound files alphabetically by filename
    const sortedSounds = [...sounds].sort((a, b) => {
        const nameA = a.split('/').pop().replace(/\.(aiff|wav|mp3)$/, '');
        const nameB = b.split('/').pop().replace(/\.(aiff|wav|mp3)$/, '');
        return nameA.localeCompare(nameB);
    });

    // Separate system sounds from custom sounds
    const systemSounds = sortedSounds.filter(s => s.includes('/System/Library/Sounds/'));
    const customSounds = sortedSounds.filter(s => !s.includes('/System/Library/Sounds/'));

    // Add system sounds group
    if (systemSounds.length > 0) {
        const systemGroup = document.createElement('optgroup');
        systemGroup.label = "Native Apple sounds";

        systemSounds.forEach(soundPath => {
            const option = document.createElement('option');
            option.value = soundPath;
            option.textContent = soundPath.split('/').pop().replace(/\.(aiff|wav|mp3)$/, '');
            systemGroup.appendChild(option);
        });

        select.appendChild(systemGroup);
    }

    // Add custom sounds group
    if (customSounds.length > 0) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = 'Custom sounds';

        customSounds.forEach(soundPath => {
            const option = document.createElement('option');
            option.value = soundPath;
            option.textContent = soundPath.split('/').pop().replace(/\.(aiff|wav|mp3)$/, '');
            customGroup.appendChild(option);
        });

        select.appendChild(customGroup);
    }

    console.log('Populated selector', select.id, 'with', sounds.length, 'sounds');
}

// ===== Toast Notifications =====

function showToast(message, type = 'success', action = null) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    // Add action button if provided
    if (action) {
        const actionBtn = document.createElement('button');
        actionBtn.textContent = action.text;
        actionBtn.className = 'toast-action';
        actionBtn.onclick = () => {
            action.onClick();
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        };
        toast.appendChild(actionBtn);
    }

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('visible'), 10);

    // Auto-dismiss only if no action button (UX best practice)
    if (!action) {
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 5000); // Increased from 3s to 5s per UX guidelines
    }
}


