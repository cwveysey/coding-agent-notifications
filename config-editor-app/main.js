import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { getCurrentWindow } from '@tauri-apps/api/window';

// State
let config = null;
let savedConfig = null;
let activePrototype = '2'; // Track which prototype is active

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await checkInstallation();
    setupEventListeners();
    setupCloseHandler();
    renderUI();
});

// Check if installation is needed
async function checkInstallation() {
    try {
        // Check if scripts are installed
        const home = await invoke('get_sounds_enabled'); // Just to test if backend is working

        // Simple check: see if .sounds-enabled exists and config exists
        const soundsEnabled = await invoke('get_sounds_enabled');

        // For now, show install banner if sounds are not enabled
        // In production, you might want a more sophisticated check
        const installBanner = document.getElementById('installBanner');
        if (!soundsEnabled && installBanner) {
            installBanner.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to check installation status:', error);
        // Show install banner on error
        const installBanner = document.getElementById('installBanner');
        if (installBanner) {
            installBanner.style.display = 'block';
        }
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
                    post_tool_use: 'voice:simple',
                    subagent_stop: 'voice:simple'
                },
                event_enabled: {
                    notification: true,
                    stop: true,
                    post_tool_use: true,
                    subagent_stop: true
                },
                voice_enabled: {
                    notification: false,
                    stop: false,
                    post_tool_use: false,
                    subagent_stop: false
                },
                voice_template: '{event} event',
                voice_provider: 'system',
                voice_id: null,
                fish_audio_api_key: null
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
            config.global_settings.event_enabled.post_tool_use ||
            config.global_settings.event_enabled.subagent_stop;
        config.global_settings.enabled = anyHookEnabled;

        // Check if we need to generate project-specific voice files
        // (only when "voice:project" is selected, not for simple voice)
        const needsProjectVoice =
            config.global_settings.event_sounds.notification === 'voice:project' ||
            config.global_settings.event_sounds.stop === 'voice:project' ||
            config.global_settings.event_sounds.post_tool_use === 'voice:project' ||
            config.global_settings.event_sounds.subagent_stop === 'voice:project' ||
            config.projects.some(p =>
                p.event_sounds.notification === 'voice:project' ||
                p.event_sounds.stop === 'voice:project' ||
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
    const events = ['notification', 'stop', 'post_tool_use', 'subagent_stop'];

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

    const saveBtnBottomSimple = document.getElementById('saveBtnBottomSimple');
    if (saveBtnBottomSimple) {
        saveBtnBottomSimple.disabled = !hasChanges;
    }

    const saveBtnBottomAlt = document.getElementById('saveBtnBottomAlt');
    if (saveBtnBottomAlt) {
        saveBtnBottomAlt.disabled = !hasChanges;
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
    // Prototype Selector
    document.querySelectorAll('.prototype-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activePrototype = e.target.dataset.prototype;

            // Update button states
            document.querySelectorAll('.prototype-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Show/hide prototypes
            document.querySelectorAll('[data-prototype-view]').forEach(proto => {
                proto.style.display = proto.dataset.prototypeView === activePrototype ? 'block' : 'none';
            });

            // Initialize project tabs if needed when switching to prototypes 2 or 4
            if (activePrototype === '2') {
                const toggle = document.getElementById('useGlobalSettings');
                if (toggle && !toggle.checked) {
                    renderProjectTabsSimple();
                }
            } else if (activePrototype === '4') {
                const toggle = document.getElementById('useGlobalSettingsAlt');
                if (toggle && !toggle.checked) {
                    renderProjectTabsAlt();
                }
            }
        });
    });

    // Simple Toggle (Prototype 2)
    const useGlobalSettings = document.getElementById('useGlobalSettings');
    if (useGlobalSettings) {
        useGlobalSettings.addEventListener('change', (e) => {
            const isGlobal = e.target.checked;
            const prototypeView = e.target.closest('[data-prototype-view]');

            const globalContent = prototypeView.querySelector('[data-global-content]');
            const projectContent = prototypeView.querySelector('[data-project-content]');

            if (isGlobal) {
                globalContent.style.display = 'block';
                projectContent.style.display = 'none';
            } else {
                globalContent.style.display = 'none';
                projectContent.style.display = 'block';
                renderProjectTabsSimple();
            }
        });
    }

    // Simple Toggle Alt (Prototype 4)
    const useGlobalSettingsAlt = document.getElementById('useGlobalSettingsAlt');
    if (useGlobalSettingsAlt) {
        useGlobalSettingsAlt.addEventListener('change', (e) => {
            const isGlobal = e.target.checked;
            const prototypeView = e.target.closest('[data-prototype-view]');

            const globalContent = prototypeView.querySelector('[data-global-content-alt]');
            const projectContent = prototypeView.querySelector('[data-project-content-alt]');

            if (isGlobal) {
                globalContent.style.display = 'block';
                projectContent.style.display = 'none';
            } else {
                globalContent.style.display = 'none';
                projectContent.style.display = 'block';
                renderProjectTabsAlt();
            }
        });
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.addEventListener('click', (e) => {
            const targetView = e.target.dataset.view;

            // Update navigation active state
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            e.target.classList.add('active');

            // Update view visibility
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.querySelector(`.view[data-view="${targetView}"]`).classList.add('active');

            // Show/hide Save button based on view
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) {
                saveBtn.style.display = targetView === 'claude-code' ? 'block' : 'none';
            }
        });
    });

    // Save buttons
    document.getElementById('saveBtn').addEventListener('click', saveConfig);

    const saveBtnBottomSimple = document.getElementById('saveBtnBottomSimple');
    if (saveBtnBottomSimple) {
        saveBtnBottomSimple.addEventListener('click', saveConfig);
    }

    const saveBtnBottomAlt = document.getElementById('saveBtnBottomAlt');
    if (saveBtnBottomAlt) {
        saveBtnBottomAlt.addEventListener('click', saveConfig);
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

    // Sound preview buttons (for prototypes - need to delegate to handle dynamically created buttons)
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-play')) {
            const soundType = e.target.dataset.sound;

            // Try global settings first
            const soundMap = {
                'notification': 'notificationSound',
                'stop': 'stopSound',
                'postToolUse': 'postToolUseSound',
                'subagentStop': 'subagentStopSound'
            };

            const selectId = soundMap[soundType];
            if (selectId) {
                const soundSelect = document.getElementById(selectId);
                if (soundSelect && soundSelect.value) {
                    try {
                        await invoke('preview_sound', { soundPath: soundSelect.value });
                    } catch (error) {
                        console.error('Failed to preview sound:', error);
                    }
                }
            }

            // Handle project-specific play buttons (from tabs)
            const projectIndex = e.target.dataset.project || e.target.dataset.projectAlt;
            const eventType = e.target.dataset.event;
            if (projectIndex !== undefined && eventType && config.projects[projectIndex]) {
                const soundPath = config.projects[projectIndex].event_sounds[eventType];
                if (soundPath) {
                    try {
                        await invoke('preview_sound', { soundPath });
                    } catch (error) {
                        console.error('Failed to preview sound:', error);
                    }
                }
            }

            // Handle prototype play buttons without data attributes - find adjacent select
            if (!soundType && projectIndex === undefined) {
                const soundControl = e.target.closest('.sound-control');
                console.log('Play button clicked, soundControl:', soundControl);
                if (soundControl) {
                    const selectElement = soundControl.querySelector('.sound-select');
                    console.log('Select element:', selectElement, 'value:', selectElement?.value);
                    if (selectElement && selectElement.value) {
                        // Check if it's a voice option
                        if (selectElement.value.startsWith('voice:')) {
                            console.log('Voice option detected:', selectElement.value);
                            // Generate and preview voice
                            const row = e.target.closest('.setting-row');
                            const label = row?.querySelector('label');
                            const eventName = label?.textContent.trim();

                            const eventText = eventName === 'Notification' ? 'notification' :
                                            eventName === 'Stop' ? 'stop' :
                                            eventName === 'PostToolUse' ? 'post tool use' :
                                            eventName === 'SubagentStop' ? 'subagent stop' : 'event';

                            const text = selectElement.value === 'voice:project'
                                ? `The ${eventText} event was run for the ${config.projects[0]?.display_name || 'project'} project`
                                : `${eventText} event`;

                            console.log('Attempting to preview voice with text:', text);
                            try {
                                // Use Fish Audio API if available
                                await invoke('preview_voice', {
                                    text,
                                    apiKey: config.global_settings.fish_audio_api_key
                                });
                                console.log('Voice preview succeeded');
                            } catch (error) {
                                console.error('Failed to preview voice:', error);
                                showToast('Voice preview failed: ' + error, 'error');
                            }
                        } else {
                            // Regular sound file
                            console.log('Sound file detected:', selectElement.value);
                            try {
                                await invoke('preview_sound', { soundPath: selectElement.value });
                            } catch (error) {
                                console.error('Failed to preview sound:', error);
                            }
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

    // Add project buttons (original)
    const addProjectBtn = document.getElementById('addProjectBtn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', async () => {
            const selected = await openDialog({
                directory: true,
                multiple: false,
                title: 'Select Project Directory',
            });

            if (selected) {
                const newProject = {
                    path: selected,
                    display_name: selected.split('/').pop() || selected,
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
                    voice_enabled: {
                        notification: false,
                        stop: false,
                        post_tool_use: false,
                        subagent_stop: false,
                    },
                };
                config.projects.push(newProject);
                markChanged();
                renderProjectList();
            }
        });
    }

    // Add project button (Simple)
    const addProjectBtnSimple = document.getElementById('addProjectBtnSimple');
    console.log('addProjectBtnSimple found:', addProjectBtnSimple);
    if (addProjectBtnSimple) {
        addProjectBtnSimple.addEventListener('click', async () => {
            console.log('Add project button clicked!');
            const selected = await openDialog({
                directory: true,
                multiple: false,
                title: 'Select Project Directory',
            });

            if (selected) {
                console.log('Selected directory:', selected);
                const newProject = {
                    path: selected,
                    display_name: selected.split('/').pop() || selected,
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
                    voice_enabled: {
                        notification: false,
                        stop: false,
                        post_tool_use: false,
                        subagent_stop: false,
                    },
                };
                config.projects.push(newProject);
                markChanged();
                renderProjectTabsSimple();
            }
        });
    } else {
        console.error('addProjectBtnSimple not found!');
    }

    // Add project button (Alt)
    const addProjectBtnAlt = document.getElementById('addProjectBtnAlt');
    if (addProjectBtnAlt) {
        addProjectBtnAlt.addEventListener('click', async () => {
            const selected = await openDialog({
                directory: true,
                multiple: false,
                title: 'Select Project Directory',
            });

            if (selected) {
                const newProject = {
                    path: selected,
                    display_name: selected.split('/').pop() || selected,
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
                    voice_enabled: {
                        notification: false,
                        stop: false,
                        post_tool_use: false,
                        subagent_stop: false,
                    },
                };
                config.projects.push(newProject);
                markChanged();
                renderProjectTabsAlt();
            }
        });
    }

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

    // Install button
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            installBtn.disabled = true;
            installBtn.textContent = 'Installing...';

            try {
                const result = await invoke('install_hooks');
                showToast(result, 'success');

                // Hide install banner
                const installBanner = document.getElementById('installBanner');
                if (installBanner) {
                    installBanner.style.display = 'none';
                }

                // Reload config to pick up new default config
                await loadConfig();
                renderUI();
            } catch (error) {
                console.error('Installation failed:', error);
                showToast('Installation failed: ' + error, 'error');
                installBtn.disabled = false;
                installBtn.textContent = 'Install Audio Notifications';
            }
        });
    }

}

// ===== Rendering =====

function renderUI() {
    // Populate all sound selectors FIRST so dropdowns have options
    populateSoundSelectors();

    // Also populate prototype view dropdowns and attach listeners
    document.querySelectorAll('.prototype-view .sound-select').forEach(select => {
        populateSoundSelector(select, config.sound_library);
        // Set default value to voice:simple if not set
        if (!select.value || select.value === '') {
            select.value = 'voice:simple';
        }

        // Add change listener to update config
        select.addEventListener('change', (e) => {
            // These are the global settings dropdowns in the prototype view
            // We need to map them to the correct event type
            const row = e.target.closest('.setting-row');
            if (!row) return;

            const label = row.querySelector('label');
            if (!label) return;

            const eventName = label.textContent.trim();
            const eventKey = eventName === 'Notification' ? 'notification' :
                            eventName === 'Stop' ? 'stop' :
                            eventName === 'PostToolUse' ? 'post_tool_use' :
                            eventName === 'SubagentStop' ? 'subagent_stop' : null;

            if (eventKey && config.global_settings.event_sounds) {
                config.global_settings.event_sounds[eventKey] = e.target.value;
                markChanged();
            }
        });
    });

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
    const postToolUseEnabled = document.getElementById('postToolUseEnabled');
    const subagentStopEnabled = document.getElementById('subagentStopEnabled');

    if (config.global_settings.event_enabled) {
        if (notificationEnabled) notificationEnabled.checked = config.global_settings.event_enabled.notification;
        if (stopEnabled) stopEnabled.checked = config.global_settings.event_enabled.stop;
        if (postToolUseEnabled) postToolUseEnabled.checked = config.global_settings.event_enabled.post_tool_use;
        if (subagentStopEnabled) subagentStopEnabled.checked = config.global_settings.event_enabled.subagent_stop;
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

        // Voice: With project name (only in project mode)
        if (!config.global_mode) {
            const voiceProject = document.createElement('option');
            voiceProject.value = 'voice:project';
            voiceProject.textContent = 'Project name is mentioned';
            voiceGroup.appendChild(voiceProject);
        }

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

// ===== Project Tabs Rendering =====

function renderProjectTabsSimple() {
    const emptyState = document.getElementById('emptyStateSimple');
    const projectTabs = document.getElementById('projectTabsSimple');
    const projectTabsNav = document.getElementById('projectTabsNavSimple');
    const projectTabsContent = document.getElementById('projectTabsContentSimple');

    if (config.projects.length === 0) {
        emptyState.style.display = 'block';
        projectTabs.style.display = 'none';
        projectTabsContent.innerHTML = '';
    } else {
        emptyState.style.display = 'none';
        projectTabs.style.display = 'block';

        // Render tabs
        projectTabsNav.innerHTML = '';
        config.projects.forEach((project, index) => {
            const tab = document.createElement('button');
            tab.className = 'tab' + (index === 0 ? ' active' : '');
            tab.dataset.projectIndex = index;
            tab.textContent = project.path;
            tab.addEventListener('click', () => {
                // Update active tab
                projectTabsNav.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding content
                document.querySelectorAll('[data-project-table-simple]').forEach((table, i) => {
                    table.style.display = i === index ? 'block' : 'none';
                });
            });
            projectTabsNav.appendChild(tab);
        });

        // Render table for each project
        projectTabsContent.innerHTML = '';
        config.projects.forEach((project, index) => {
            const tableContainer = document.createElement('div');
            tableContainer.dataset.projectTableSimple = index;
            tableContainer.style.display = index === 0 ? 'block' : 'none';

            tableContainer.innerHTML = `
                <div class="card" style="margin-bottom: 12px;">
                    <div class="setting-row">
                        <div class="setting-label">
                            <label>Project display name</label>
                            <p class="hint">Used in voice announcements when "Voice: With project name" is selected</p>
                        </div>
                        <input type="text" class="text-input" data-project-name="${index}" value="${project.display_name || project.path.split('/').pop()}" placeholder="Enter project name" style="flex: 1; max-width: 300px; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text);">
                    </div>
                </div>

                <div class="card">
                    <div class="table-header">
                        <div class="table-header-cell">Event</div>
                        <div class="table-header-controls">
                            <div class="table-header-cell sound-header">Sound</div>
                            <div class="table-header-cell play-header"></div>
                            <div class="table-header-cell enabled-header">Enabled</div>
                        </div>
                    </div>

                    <div class="setting-row">
                        <div class="setting-label">
                            <label>Notification</label>
                            <p class="hint">Runs when Claude Code sends notifications</p>
                        </div>
                        <div class="sound-control">
                            <select class="sound-select" data-project="${index}" data-event="notification"></select>
                            <button class="btn-play" data-project="${index}" data-event="notification" title="Preview this sound">▶</button>
                            <input type="checkbox" class="toggle" data-project="${index}" data-event="notification" ${project.event_enabled.notification ? 'checked' : ''}>
                        </div>
                    </div>

                    <div class="setting-row">
                        <div class="setting-label">
                            <label>Stop</label>
                            <p class="hint">Runs when Claude Code finishes responding</p>
                        </div>
                        <div class="sound-control">
                            <select class="sound-select" data-project="${index}" data-event="stop"></select>
                            <button class="btn-play" data-project="${index}" data-event="stop" title="Preview this sound">▶</button>
                            <input type="checkbox" class="toggle" data-project="${index}" data-event="stop" ${project.event_enabled.stop ? 'checked' : ''}>
                        </div>
                    </div>

                    <div class="setting-row">
                        <div class="setting-label">
                            <label>PostToolUse</label>
                            <p class="hint">Runs after tool calls complete</p>
                        </div>
                        <div class="sound-control">
                            <select class="sound-select" data-project="${index}" data-event="post_tool_use"></select>
                            <button class="btn-play" data-project="${index}" data-event="post_tool_use" title="Preview this sound">▶</button>
                            <input type="checkbox" class="toggle" data-project="${index}" data-event="post_tool_use" ${project.event_enabled.post_tool_use ? 'checked' : ''}>
                        </div>
                    </div>

                    <div class="setting-row">
                        <div class="setting-label">
                            <label>SubagentStop</label>
                            <p class="hint">Runs when subagent tasks complete</p>
                        </div>
                        <div class="sound-control">
                            <select class="sound-select" data-project="${index}" data-event="subagent_stop"></select>
                            <button class="btn-play" data-project="${index}" data-event="subagent_stop" title="Preview this sound">▶</button>
                            <input type="checkbox" class="toggle" data-project="${index}" data-event="subagent_stop" ${project.event_enabled.subagent_stop ? 'checked' : ''}>
                        </div>
                    </div>
                </div>

                <button class="btn-remove" data-project-remove="${index}" style="margin-top: 16px;">Remove this project</button>
            `;

            projectTabsContent.appendChild(tableContainer);

            // Display name input listener
            const displayNameInput = tableContainer.querySelector('[data-project-name]');
            if (displayNameInput) {
                displayNameInput.addEventListener('input', (e) => {
                    config.projects[index].display_name = e.target.value;
                    markChanged();
                });
            }

            // Populate sound selectors
            tableContainer.querySelectorAll('.sound-select').forEach(select => {
                populateSoundSelector(select, config.sound_library);
                const event = select.dataset.event;
                select.value = project.event_sounds[event];

                select.addEventListener('change', (e) => {
                    config.projects[index].event_sounds[event] = e.target.value;
                    markChanged();
                });
            });

            // Play button listeners handled by event delegation (lines 261-299)

            // Toggle listeners
            tableContainer.querySelectorAll('.toggle').forEach(toggle => {
                toggle.addEventListener('change', (e) => {
                    const event = e.target.dataset.event;
                    config.projects[index].event_enabled[event] = e.target.checked;
                    markChanged();
                });
            });

            // Remove button listener
            const removeBtn = tableContainer.querySelector('[data-project-remove]');
            removeBtn.addEventListener('click', () => {
                config.projects.splice(index, 1);
                markChanged();
                renderProjectTabsSimple();
            });
        });
    }
}

function renderProjectTabsAlt() {
    const emptyState = document.getElementById('emptyStateAlt');
    const projectTabs = document.getElementById('projectTabsAlt');
    const projectTabsNav = document.getElementById('projectTabsNavAlt');
    const projectTabsContent = document.getElementById('projectTabsContentAlt');

    if (config.projects.length === 0) {
        emptyState.style.display = 'block';
        projectTabs.style.display = 'none';
        projectTabsContent.innerHTML = '';
    } else {
        emptyState.style.display = 'none';
        projectTabs.style.display = 'block';

        // Render tabs
        projectTabsNav.innerHTML = '';
        config.projects.forEach((project, index) => {
            const tab = document.createElement('button');
            tab.className = 'tab' + (index === 0 ? ' active' : '');
            tab.dataset.projectIndex = index;
            tab.textContent = project.path;
            tab.addEventListener('click', () => {
                // Update active tab
                projectTabsNav.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding content
                document.querySelectorAll('[data-project-table-alt]').forEach((table, i) => {
                    table.style.display = i === index ? 'block' : 'none';
                });
            });
            projectTabsNav.appendChild(tab);
        });

        // Render table for each project
        projectTabsContent.innerHTML = '';
        config.projects.forEach((project, index) => {
            const tableContainer = document.createElement('div');
            tableContainer.dataset.projectTableAlt = index;
            tableContainer.style.display = index === 0 ? 'block' : 'none';

            tableContainer.innerHTML = `
                <div class="card" style="margin-bottom: 12px;">
                    <div class="setting-row">
                        <div class="setting-label">
                            <label>Project display name</label>
                            <p class="hint">Used in voice announcements when "Voice: With project name" is selected</p>
                        </div>
                        <input type="text" class="text-input" data-project-name="${index}" value="${project.display_name || project.path.split('/').pop()}" placeholder="Enter project name" style="flex: 1; max-width: 300px; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text);">
                    </div>
                </div>

                <div class="card">
                    <div class="table-header">
                        <div class="table-header-cell">Event</div>
                        <div class="table-header-controls">
                            <div class="table-header-cell sound-header">Sound</div>
                            <div class="table-header-cell play-header"></div>
                            <div class="table-header-cell enabled-header">Enabled</div>
                        </div>
                    </div>

                    <div class="setting-row">
                        <div class="setting-label">
                            <label>Notification</label>
                            <p class="hint">Runs when Claude Code sends notifications</p>
                        </div>
                        <div class="sound-control">
                            <select class="sound-select" data-project-alt="${index}" data-event="notification"></select>
                            <button class="btn-play" data-project-alt="${index}" data-event="notification" title="Preview this sound">▶</button>
                            <input type="checkbox" class="toggle" data-project-alt="${index}" data-event="notification" ${project.event_enabled.notification ? 'checked' : ''}>
                        </div>
                    </div>

                    <div class="setting-row">
                        <div class="setting-label">
                            <label>Stop</label>
                            <p class="hint">Runs when Claude Code finishes responding</p>
                        </div>
                        <div class="sound-control">
                            <select class="sound-select" data-project-alt="${index}" data-event="stop"></select>
                            <button class="btn-play" data-project-alt="${index}" data-event="stop" title="Preview this sound">▶</button>
                            <input type="checkbox" class="toggle" data-project-alt="${index}" data-event="stop" ${project.event_enabled.stop ? 'checked' : ''}>
                        </div>
                    </div>

                    <div class="setting-row">
                        <div class="setting-label">
                            <label>PostToolUse</label>
                            <p class="hint">Runs after tool calls complete</p>
                        </div>
                        <div class="sound-control">
                            <select class="sound-select" data-project-alt="${index}" data-event="post_tool_use"></select>
                            <button class="btn-play" data-project-alt="${index}" data-event="post_tool_use" title="Preview this sound">▶</button>
                            <input type="checkbox" class="toggle" data-project-alt="${index}" data-event="post_tool_use" ${project.event_enabled.post_tool_use ? 'checked' : ''}>
                        </div>
                    </div>

                    <div class="setting-row">
                        <div class="setting-label">
                            <label>SubagentStop</label>
                            <p class="hint">Runs when subagent tasks complete</p>
                        </div>
                        <div class="sound-control">
                            <select class="sound-select" data-project-alt="${index}" data-event="subagent_stop"></select>
                            <button class="btn-play" data-project-alt="${index}" data-event="subagent_stop" title="Preview this sound">▶</button>
                            <input type="checkbox" class="toggle" data-project-alt="${index}" data-event="subagent_stop" ${project.event_enabled.subagent_stop ? 'checked' : ''}>
                        </div>
                    </div>
                </div>

                <button class="btn-remove" data-project-remove-alt="${index}" style="margin-top: 16px;">Remove this project</button>
            `;

            projectTabsContent.appendChild(tableContainer);

            // Display name input listener
            const displayNameInput = tableContainer.querySelector('[data-project-name]');
            if (displayNameInput) {
                displayNameInput.addEventListener('input', (e) => {
                    config.projects[index].display_name = e.target.value;
                    markChanged();
                });
            }

            // Populate sound selectors
            tableContainer.querySelectorAll('.sound-select').forEach(select => {
                populateSoundSelector(select, config.sound_library);
                const event = select.dataset.event;
                select.value = project.event_sounds[event];

                select.addEventListener('change', (e) => {
                    config.projects[index].event_sounds[event] = e.target.value;
                    markChanged();
                });
            });

            // Play button listeners handled by event delegation (lines 261-299)

            // Toggle listeners
            tableContainer.querySelectorAll('.toggle').forEach(toggle => {
                toggle.addEventListener('change', (e) => {
                    const event = e.target.dataset.event;
                    config.projects[index].event_enabled[event] = e.target.checked;
                    markChanged();
                });
            });

            // Remove button listener
            const removeBtn = tableContainer.querySelector('[data-project-remove-alt]');
            removeBtn.addEventListener('click', () => {
                config.projects.splice(index, 1);
                markChanged();
                renderProjectTabsAlt();
            });
        });
    }
}

