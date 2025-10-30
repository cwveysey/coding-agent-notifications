import { invoke } from '@tauri-apps/api/core';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { initAnalytics, trackEvent, trackError, setAnalyticsEnabled, isAnalyticsEnabled } from './analytics.js';

// State
let config = null;
let savedConfig = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize analytics (respects user preference)
    initAnalytics();
    trackEvent('app_opened');

    await loadConfig();
    await checkInstallation();
    setupEventListeners();
    setupCloseHandler();
    renderUI();
    loadInstallationInfo();
    updateReinstallBanner();
});

// Check if installation is needed and auto-install
async function checkInstallation() {
    try {
        // Check if we've already run auto-install this session
        if (window.autoInstallAttempted) {
            return;
        }
        window.autoInstallAttempted = true;

        // Check if scripts are installed
        const soundsEnabled = await invoke('get_sounds_enabled');

        if (!soundsEnabled) {
            // Check if user deliberately uninstalled - don't auto-reinstall
            const wasUninstalled = await invoke('was_uninstalled');
            if (wasUninstalled) {
                console.log('User previously uninstalled - skipping auto-install');
                return;
            }

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
                showToast('Installation complete - you will now receive alerts for designated events.', 'success');

                // Reload config to pick up new default config
                await loadConfig();
                renderUI();
                trackEvent('installation_complete');
            } catch (error) {
                console.error('Auto-installation failed:', error);
                showToast('Installation failed: ' + error, 'error');
                trackError(error, { context: 'auto_installation' });
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
                    pre_tool_use: false,
                    post_tool_use: false,
                    subagent_stop: true
                },
                voice_enabled: {
                    notification: true,
                    stop: true,
                    pre_tool_use: false,
                    post_tool_use: false,
                    subagent_stop: true
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
        trackEvent('settings_saved');
    } catch (error) {
        console.error('Failed to save config:', error);
        showToast('Failed to save configuration', 'error');
        trackError(error, { context: 'save_config' });
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

            // Load activity log when recent-activity view is selected
            if (targetView === 'recent-activity') {
                loadActivityLog();
            }

            // Update reinstall banner when overview is selected
            if (targetView === 'overview') {
                updateReinstallBanner();
            }

            // Load installation info when FAQ view is selected (for uninstall section)
            if (targetView === 'faq') {
                loadInstallationInfo();
                updateInstallToggleButton();
            }
        });
    });

    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveConfig);

    document.getElementById('notificationSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.notification = e.target.value;
        markChanged();
        trackEvent('sound_changed', { hook_type: 'notification', sound_type: e.target.value.startsWith('voice:') ? 'voice' : 'sound' });
    });

    document.getElementById('stopSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.stop = e.target.value;
        markChanged();
        trackEvent('sound_changed', { hook_type: 'stop', sound_type: e.target.value.startsWith('voice:') ? 'voice' : 'sound' });
    });

    document.getElementById('preToolUseSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.pre_tool_use = e.target.value;
        markChanged();
        trackEvent('sound_changed', { hook_type: 'pre_tool_use', sound_type: e.target.value.startsWith('voice:') ? 'voice' : 'sound' });
    });

    document.getElementById('postToolUseSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.post_tool_use = e.target.value;
        markChanged();
        trackEvent('sound_changed', { hook_type: 'post_tool_use', sound_type: e.target.value.startsWith('voice:') ? 'voice' : 'sound' });
    });

    document.getElementById('subagentStopSound').addEventListener('change', (e) => {
        config.global_settings.event_sounds.subagent_stop = e.target.value;
        markChanged();
        trackEvent('sound_changed', { hook_type: 'subagent_stop', sound_type: e.target.value.startsWith('voice:') ? 'voice' : 'sound' });
    });

    // Visual notification toggles
    document.getElementById('notificationVisual').addEventListener('change', (e) => {
        config.global_settings.event_enabled.notification = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'notification', visual: e.target.checked });
    });

    document.getElementById('stopVisual').addEventListener('change', (e) => {
        config.global_settings.event_enabled.stop = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'stop', visual: e.target.checked });
    });

    document.getElementById('preToolUseVisual').addEventListener('change', (e) => {
        config.global_settings.event_enabled.pre_tool_use = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'pre_tool_use', visual: e.target.checked });
    });

    document.getElementById('postToolUseVisual').addEventListener('change', (e) => {
        config.global_settings.event_enabled.post_tool_use = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'post_tool_use', visual: e.target.checked });
    });

    document.getElementById('subagentStopVisual').addEventListener('change', (e) => {
        config.global_settings.event_enabled.subagent_stop = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'subagent_stop', visual: e.target.checked });
    });

    // Audio notification toggles
    document.getElementById('notificationAudio').addEventListener('change', (e) => {
        config.global_settings.voice_enabled.notification = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'notification', audio: e.target.checked });
    });

    document.getElementById('stopAudio').addEventListener('change', (e) => {
        config.global_settings.voice_enabled.stop = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'stop', audio: e.target.checked });
    });

    document.getElementById('preToolUseAudio').addEventListener('change', (e) => {
        config.global_settings.voice_enabled.pre_tool_use = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'pre_tool_use', audio: e.target.checked });
    });

    document.getElementById('postToolUseAudio').addEventListener('change', (e) => {
        config.global_settings.voice_enabled.post_tool_use = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'post_tool_use', audio: e.target.checked });
    });

    document.getElementById('subagentStopAudio').addEventListener('change', (e) => {
        config.global_settings.voice_enabled.subagent_stop = e.target.checked;
        markChanged();
        trackEvent('hook_toggled', { hook_type: 'subagent_stop', audio: e.target.checked });
    });

    // Respect Do Not Disturb toggle
    document.getElementById('respectDND').addEventListener('change', (e) => {
        config.global_settings.respect_do_not_disturb = e.target.checked;
        markChanged();
        trackEvent('focus_mode_toggled', { enabled: e.target.checked });
    });

    // Analytics toggle
    const analyticsToggle = document.getElementById('analyticsEnabled');
    if (analyticsToggle) {
        // Initialize from current state
        analyticsToggle.checked = isAnalyticsEnabled();

        analyticsToggle.addEventListener('change', (e) => {
            setAnalyticsEnabled(e.target.checked);
            showToast(e.target.checked ? 'Analytics enabled' : 'Analytics disabled', 'success');
        });
    }

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
                trackEvent('custom_sound_added');
            } catch (error) {
                console.error('Failed to upload sound:', error);
                showToast('Failed to upload audio file: ' + error);
                trackError(error, { context: 'upload_sound' });
            }
        }
    });

    // Reinstall banner button
    const reinstallBannerBtn = document.getElementById('reinstallBannerBtn');
    if (reinstallBannerBtn) {
        reinstallBannerBtn.addEventListener('click', async () => {
            try {
                if (!confirm('Reinstall audio notifications?')) {
                    return;
                }

                reinstallBannerBtn.disabled = true;
                reinstallBannerBtn.textContent = 'Restoring...';

                await invoke('install_hooks');

                showToast('Installation complete!', 'success');

                // Show restart message
                setTimeout(() => {
                    alert('Installation complete!\n\nIMPORTANT: You need to start a new Claude Code session for the hooks to take effect. Your current session will not have notifications enabled until you restart.');
                }, 500);

                reinstallBannerBtn.disabled = false;
                reinstallBannerBtn.textContent = 'Restore notifications values';

                await loadConfig();
                renderUI();
                await loadInstallationInfo();
                await updateReinstallBanner();
                await updateInstallToggleButton();
                trackEvent('reinstall_from_banner');
            } catch (error) {
                console.error('Reinstall failed:', error);
                showToast('Reinstall failed: ' + error, 'error');
                trackError(error, { context: 'reinstall_banner' });
                reinstallBannerBtn.disabled = false;
                reinstallBannerBtn.textContent = 'Restore notifications values';
            }
        });
    }

    // FAQ reinstall button
    const faqReinstallBtn = document.getElementById('faqReinstallBtn');
    if (faqReinstallBtn) {
        faqReinstallBtn.addEventListener('click', async () => {
            try {
                if (!confirm('Reinstall audio notifications?')) {
                    return;
                }

                faqReinstallBtn.disabled = true;
                faqReinstallBtn.textContent = 'Restoring...';

                await invoke('install_hooks');

                showToast('Installation complete!', 'success');

                // Show restart message
                setTimeout(() => {
                    alert('Installation complete!\n\nIMPORTANT: You need to start a new Claude Code session for the hooks to take effect. Your current session will not have notifications enabled until you restart.');
                }, 500);

                faqReinstallBtn.disabled = false;
                faqReinstallBtn.textContent = 'Restore notifications values';

                await loadConfig();
                renderUI();
                await loadInstallationInfo();
                await updateReinstallBanner();
                await updateInstallToggleButton();
                trackEvent('reinstall_from_faq');
            } catch (error) {
                console.error('Reinstall failed:', error);
                showToast('Reinstall failed: ' + error, 'error');
                trackError(error, { context: 'reinstall_faq' });
                faqReinstallBtn.disabled = false;
                faqReinstallBtn.textContent = 'Restore notifications values';
            }
        });
    }

    // Install/Uninstall toggle button
    const installToggleBtn = document.getElementById('installToggleBtn');
    if (installToggleBtn) {
        // Update button state based on installation status
        updateInstallToggleButton();

        installToggleBtn.addEventListener('click', async () => {
            try {
                const soundsEnabled = await invoke('get_sounds_enabled');

                if (soundsEnabled) {
                    // UNINSTALL
                    const manifest = await invoke('get_installation_info');

                    const confirmMessage = `Are you sure you want to uninstall audio notifications?\n\nThis will:\n- Remove ${manifest.changes.hooks_added.length} hooks from Claude Code\n- Delete ${manifest.changes.files_created.length} files\n- Preserve your audio-notifier.yaml config\n${manifest.changes.existing_hooks_preserved.length > 0 ? `- Keep your existing hooks: ${manifest.changes.existing_hooks_preserved.join(', ')}` : ''}\n\nA backup will be created before uninstalling.`;

                    if (!confirm(confirmMessage)) {
                        return;
                    }

                    installToggleBtn.disabled = true;
                    installToggleBtn.textContent = 'Removing...';

                    const result = await invoke('uninstall_hooks');

                    // Show restart warning
                    const restartWarning = document.getElementById('restartWarning');
                    if (restartWarning) {
                        restartWarning.style.display = 'block';
                    }

                    showToast('Uninstallation complete!', 'success');

                    // Show detailed result
                    setTimeout(() => {
                        alert(result);
                    }, 500);

                    // Update button to reinstall state
                    installToggleBtn.disabled = false;
                    installToggleBtn.textContent = 'Restore notifications values';

                    await loadInstallationInfo();
                    await updateReinstallBanner();
                    trackEvent('uninstall_complete');
                } else {
                    // REINSTALL
                    if (!confirm('Reinstall audio notifications?')) {
                        return;
                    }

                    installToggleBtn.disabled = true;
                    installToggleBtn.textContent = 'Restoring...';

                    const result = await invoke('install_hooks');

                    // Hide restart warning
                    const restartWarning = document.getElementById('restartWarning');
                    if (restartWarning) {
                        restartWarning.style.display = 'none';
                    }

                    showToast('Installation complete!', 'success');

                    // Show restart message
                    setTimeout(() => {
                        alert('Installation complete!\n\nIMPORTANT: You need to start a new Claude Code session for the hooks to take effect. Your current session will not have notifications enabled until you restart.');
                    }, 500);

                    // Update button to uninstall state
                    installToggleBtn.disabled = false;
                    installToggleBtn.textContent = 'Remove relevant values';

                    await loadConfig();
                    renderUI();
                    await loadInstallationInfo();
                    await updateReinstallBanner();
                    trackEvent('reinstall_complete');
                }
            } catch (error) {
                console.error('Install/Uninstall failed:', error);
                showToast('Operation failed: ' + error, 'error');
                trackError(error, { context: 'install_toggle' });
                installToggleBtn.disabled = false;
                await updateInstallToggleButton();
            }
        });
    }

    // Export log button
    const exportLogBtn = document.getElementById('exportLogBtn');
    if (exportLogBtn) {
        exportLogBtn.addEventListener('click', async () => {
            try {
                const logJson = await invoke('export_installation_log');

                // Use Tauri's save dialog
                const filePath = await saveDialog({
                    filters: [{ name: 'JSON', extensions: ['json'] }],
                    defaultPath: 'audio-notifier-installation.json'
                });

                if (filePath) {
                    await writeTextFile(filePath, logJson);
                    showToast('Installation log exported', 'success');
                    trackEvent('export_installation_log');
                } else {
                    // User cancelled the dialog
                    trackEvent('export_cancelled');
                }
            } catch (error) {
                console.error('Export failed:', error);
                showToast('Export failed: ' + error, 'error');
            }
        });
    }

    // Export diagnostics button
    const exportDiagnosticsBtn = document.getElementById('exportDiagnosticsBtn');
    if (exportDiagnosticsBtn) {
        exportDiagnosticsBtn.addEventListener('click', async () => {
            try {
                const diagnosticsJson = await invoke('export_diagnostics');

                const filePath = await saveDialog({
                    filters: [{ name: 'JSON', extensions: ['json'] }],
                    defaultPath: `claude-notifications-diagnostics-${new Date().toISOString().split('T')[0]}.json`
                });

                if (filePath) {
                    await writeTextFile(filePath, diagnosticsJson);
                    showToast('Diagnostics exported successfully', 'success');
                    trackEvent('export_diagnostics');
                }
            } catch (error) {
                console.error('Export diagnostics failed:', error);
                showToast('Failed to export diagnostics: ' + error, 'error');
                trackError(error, { context: 'export_diagnostics' });
            }
        });
    }

    // Open Focus Settings link
    const openFocusSettingsLink = document.getElementById('openFocusSettingsLink');
    if (openFocusSettingsLink) {
        openFocusSettingsLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await invoke('open_focus_settings');
            } catch (error) {
                console.error('Failed to open Focus settings:', error);
                showToast('Failed to open Focus settings. Please open System Settings manually.', 'error');
            }
        });
    }

    // Note: Installation now happens automatically on first launch
    // No manual install button needed
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

    // Set visual notification toggles
    const notificationVisual = document.getElementById('notificationVisual');
    const stopVisual = document.getElementById('stopVisual');
    const preToolUseVisual = document.getElementById('preToolUseVisual');
    const postToolUseVisual = document.getElementById('postToolUseVisual');
    const subagentStopVisual = document.getElementById('subagentStopVisual');

    if (config.global_settings.event_enabled) {
        if (notificationVisual) notificationVisual.checked = config.global_settings.event_enabled.notification;
        if (stopVisual) stopVisual.checked = config.global_settings.event_enabled.stop;
        if (preToolUseVisual) preToolUseVisual.checked = config.global_settings.event_enabled.pre_tool_use;
        if (postToolUseVisual) postToolUseVisual.checked = config.global_settings.event_enabled.post_tool_use;
        if (subagentStopVisual) subagentStopVisual.checked = config.global_settings.event_enabled.subagent_stop;
    }

    // Set audio notification toggles
    const notificationAudio = document.getElementById('notificationAudio');
    const stopAudio = document.getElementById('stopAudio');
    const preToolUseAudio = document.getElementById('preToolUseAudio');
    const postToolUseAudio = document.getElementById('postToolUseAudio');
    const subagentStopAudio = document.getElementById('subagentStopAudio');

    if (config.global_settings.voice_enabled) {
        if (notificationAudio) notificationAudio.checked = config.global_settings.voice_enabled.notification;
        if (stopAudio) stopAudio.checked = config.global_settings.voice_enabled.stop;
        if (preToolUseAudio) preToolUseAudio.checked = config.global_settings.voice_enabled.pre_tool_use;
        if (postToolUseAudio) postToolUseAudio.checked = config.global_settings.voice_enabled.post_tool_use;
        if (subagentStopAudio) subagentStopAudio.checked = config.global_settings.voice_enabled.subagent_stop;
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

// ===== Installation Info and Uninstall =====

async function updateReinstallBanner() {
    const installedContent = document.getElementById('installedContent');
    const uninstalledContent = document.getElementById('uninstalledContent');
    const faqInstalledContent = document.getElementById('faqInstalledContent');
    const faqUninstalledContent = document.getElementById('faqUninstalledContent');

    if (!installedContent || !uninstalledContent) return;

    try {
        const soundsEnabled = await invoke('get_sounds_enabled');
        if (soundsEnabled) {
            // Show installed content, hide uninstalled content
            installedContent.style.display = 'block';
            uninstalledContent.style.display = 'none';
            if (faqInstalledContent) faqInstalledContent.style.display = 'block';
            if (faqUninstalledContent) faqUninstalledContent.style.display = 'none';
        } else {
            // Show uninstalled content, hide installed content
            installedContent.style.display = 'none';
            uninstalledContent.style.display = 'block';
            if (faqInstalledContent) faqInstalledContent.style.display = 'none';
            if (faqUninstalledContent) faqUninstalledContent.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to check installation status:', error);
    }
}

async function updateInstallToggleButton() {
    const installToggleBtn = document.getElementById('installToggleBtn');
    if (!installToggleBtn) return;

    try {
        const soundsEnabled = await invoke('get_sounds_enabled');
        if (soundsEnabled) {
            installToggleBtn.textContent = 'Remove relevant values';
        } else {
            installToggleBtn.textContent = 'Restore notifications values';
        }
    } catch (error) {
        console.error('Failed to check installation status:', error);
    }
}

async function loadInstallationInfo() {
    const infoDiv = document.getElementById('installationInfo');
    if (!infoDiv) return;

    try {
        const manifest = await invoke('get_installation_info');

        const installedDate = new Date(manifest.installed_at).toLocaleString();
        const filesCount = manifest.changes.files_created.length;
        const hooksCount = manifest.changes.hooks_added.length;

        let html = `
            <div style="font-size: 14px; line-height: 1.8;">
                <p><strong>Installed:</strong> ${installedDate}</p>
                <p><strong>App Version:</strong> ${manifest.app_version}</p>
                <p><strong>Files Created:</strong> ${filesCount}</p>
                <p><strong>Hooks Added:</strong> ${hooksCount} (${manifest.changes.hooks_added.join(', ')})</p>
        `;

        if (manifest.changes.existing_hooks_preserved.length > 0) {
            html += `<p><strong>Existing Hooks Preserved:</strong> ${manifest.changes.existing_hooks_preserved.join(', ')}</p>`;
        }

        html += `<p><strong>Backup Location:</strong><br><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${manifest.backup_path}</code></p>`;
        html += `</div>`;

        infoDiv.innerHTML = html;
    } catch (error) {
        console.error('Failed to load installation info:', error);
        infoDiv.innerHTML = `<p style="color: #666;">Installation information not available. This may be an older installation.</p>`;
    }
}

// ===== Activity Log =====

async function loadActivityLog() {
    const tbody = document.getElementById('activityTableBody');
    if (!tbody) return;

    try {
        const events = await invoke('get_activity_log');

        if (events.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="empty-state-cell">
                        <div class="empty-state">
                            <p class="hint">No recent activity to display.</p>
                            <p class="hint" style="margin-top: 8px;">Events will appear here as Claude Code triggers notifications.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Format events into table rows
        tbody.innerHTML = events.map((event, index) => {
            // Format timestamp to local time with timezone
            const date = new Date(event.timestamp);
            const dateStr = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
            const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            });

            // Format event name (capitalize first letter, replace underscores)
            const eventName = event.event
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            // Display message or placeholder
            const truncatedMessage = event.message || '—';
            const fullMessage = event.full_message || event.message || '—';
            const project = event.project || '';

            // Check if message is expandable (has more content)
            const isExpandable = fullMessage.length > truncatedMessage.length;
            const rowId = `activity-row-${index}`;

            return `
                <tr class="activity-row ${isExpandable ? 'expandable' : ''}" data-row-id="${rowId}">
                    <td><div class="timestamp-date">${dateStr}</div><div class="timestamp-time">${timeStr}</div></td>
                    <td>${eventName}</td>
                    <td class="message-cell">
                        <div class="message-preview">${truncatedMessage}${isExpandable ? '<span class="expand-indicator">…</span>' : ''}</div>
                        ${isExpandable ? `
                            <div class="message-expanded" style="display: none;">
                                ${project ? `<div class="message-project"><strong>Project:</strong> ${project}</div>` : ''}
                                <div class="message-full">${fullMessage}</div>
                            </div>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        // Add click handlers for expandable rows
        document.querySelectorAll('.activity-row.expandable').forEach(row => {
            row.addEventListener('click', () => {
                const messageCell = row.querySelector('.message-cell');
                const preview = messageCell.querySelector('.message-preview');
                const expanded = messageCell.querySelector('.message-expanded');

                if (expanded.style.display === 'none') {
                    preview.style.display = 'none';
                    expanded.style.display = 'block';
                    row.classList.add('expanded');
                } else {
                    preview.style.display = 'block';
                    expanded.style.display = 'none';
                    row.classList.remove('expanded');
                }
            });
        });
    } catch (error) {
        console.error('Failed to load activity log:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-state-cell">
                    <div class="empty-state">
                        <p class="hint" style="color: #ff3b30;">Failed to load activity log.</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

