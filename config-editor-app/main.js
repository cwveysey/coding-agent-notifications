import { invoke } from '@tauri-apps/api/core';

// System sounds available on macOS
const SYSTEM_SOUNDS = [
    '/System/Library/Sounds/Submarine.aiff',
    '/System/Library/Sounds/Glass.aiff',
    '/System/Library/Sounds/Ping.aiff',
    '/System/Library/Sounds/Tink.aiff',
    '/System/Library/Sounds/Purr.aiff',
    '/System/Library/Sounds/Pop.aiff',
    '/System/Library/Sounds/Funk.aiff',
    '/System/Library/Sounds/Hero.aiff',
    '/System/Library/Sounds/Blow.aiff',
    '/System/Library/Sounds/Bottle.aiff',
    '/System/Library/Sounds/Frog.aiff',
    '/System/Library/Sounds/Basso.aiff'
];

let currentConfig = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    setupEventListeners();
    await loadConfiguration();
    populateSoundSelectors();
});

// Navigation between sections
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.config-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding section
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(`${sectionId}-section`).classList.add('active');

            // Update section title
            const titles = {
                sound: 'Sound Settings',
                notifications: 'Notification Settings',
                inactivity: 'Inactivity Detection',
                logging: 'Logging Settings'
            };
            document.getElementById('sectionTitle').textContent = titles[sectionId];
        });
    });
}

// Setup all event listeners
function setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveConfiguration);

    // Import button
    document.getElementById('importBtn').addEventListener('click', importConfiguration);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetToDefaults);

    // Sound preview buttons
    document.getElementById('previewDefault')?.addEventListener('click', () => {
        previewSound(document.getElementById('defaultSound').value);
    });

    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const event = e.target.dataset.event;
            const soundPath = document.getElementById(`${event}Sound`).value;
            previewSound(soundPath);
        });
    });

    // Add sound button
    document.getElementById('addSoundBtn')?.addEventListener('click', addCustomSound);

    // Add project mapping button
    document.getElementById('addProjectBtn')?.addEventListener('click', addProjectMapping);

    // View log buttons
    document.getElementById('viewLogBtn')?.addEventListener('click', () => {
        invoke('open_log_file', { logType: 'questions' });
    });

    document.getElementById('viewDebugBtn')?.addEventListener('click', () => {
        invoke('open_log_file', { logType: 'debug' });
    });

    // Ntfy toggle
    document.getElementById('ntfyEnabled')?.addEventListener('change', (e) => {
        const ntfySettings = document.getElementById('ntfySettings');
        ntfySettings.style.display = e.target.checked ? 'block' : 'none';
    });
}

// Load configuration from backend
async function loadConfiguration() {
    try {
        const config = await invoke('load_config');
        currentConfig = config;
        populateFormFromConfig(config);
    } catch (error) {
        console.error('Failed to load configuration:', error);
        alert('Failed to load configuration: ' + error);
    }
}

// Populate form fields from config object
function populateFormFromConfig(config) {
    // Sound settings
    document.getElementById('soundEnabled').checked = config.sound?.enabled ?? true;
    document.getElementById('defaultSound').value = config.sound?.file ?? SYSTEM_SOUNDS[0];
    document.getElementById('randomEnabled').checked = config.sound?.random ?? false;
    document.getElementById('minInterval').value = config.sound?.min_interval ?? 2;

    // Event sounds
    document.getElementById('permissionSound').value = config.sound?.event_sounds?.permission ?? SYSTEM_SOUNDS[2];
    document.getElementById('questionSound').value = config.sound?.event_sounds?.question ?? SYSTEM_SOUNDS[2];
    document.getElementById('inactivitySound').value = config.sound?.event_sounds?.inactivity ?? SYSTEM_SOUNDS[2];

    // Populate available sounds
    const availableSounds = document.getElementById('availableSounds');
    availableSounds.innerHTML = '';
    (config.sound?.available_sounds || SYSTEM_SOUNDS).forEach(sound => {
        addSoundToList(sound);
    });

    // Populate project sounds
    const projectSounds = document.getElementById('projectSounds');
    projectSounds.innerHTML = '';
    if (config.sound?.project_sounds) {
        Object.entries(config.sound.project_sounds).forEach(([project, sound]) => {
            addProjectMappingToList(project, sound);
        });
    }

    // Notification settings
    document.getElementById('audioNotifEnabled').checked = config.notifications?.audio?.enabled ?? true;
    document.getElementById('terminalNotifEnabled').checked = config.notifications?.terminal_notifier?.enabled ?? true;
    document.getElementById('notifTitle').value = config.notifications?.terminal_notifier?.title ?? 'Claude Code';
    document.getElementById('notifSubtitle').value = config.notifications?.terminal_notifier?.subtitle ?? 'Question Detected';

    document.getElementById('permissionMsg').value = config.notifications?.messages?.permission ?? 'Claude requires your permission';
    document.getElementById('questionMsg').value = config.notifications?.messages?.question ?? 'Claude has a question';
    document.getElementById('inactivityMsg').value = config.notifications?.messages?.inactivity ?? 'Claude requires your direction';

    // Ntfy settings
    const ntfyEnabled = config.notifications?.ntfy?.enabled ?? false;
    document.getElementById('ntfyEnabled').checked = ntfyEnabled;
    document.getElementById('ntfySettings').style.display = ntfyEnabled ? 'block' : 'none';
    document.getElementById('ntfyTopic').value = config.notifications?.ntfy?.topic ?? '';
    document.getElementById('ntfyServer').value = config.notifications?.ntfy?.server ?? 'https://ntfy.sh';
    document.getElementById('ntfyPriority').value = config.notifications?.ntfy?.priority ?? 'default';

    // Inactivity settings
    document.getElementById('inactivityEnabled').checked = config.inactivity?.enabled ?? true;
    document.getElementById('inactivityTimeout').value = config.inactivity?.timeout ?? 30;
    document.getElementById('inactivityMessage').value = config.inactivity?.message ?? 'Claude may be waiting for input';

    // Logging settings
    document.getElementById('logQuestionsEnabled').checked = config.logging?.log_questions ?? true;
    document.getElementById('logFile').value = config.logging?.log_file ?? '~/.claude/questions-detected.log';
    document.getElementById('debugEnabled').checked = config.logging?.debug ?? false;
    document.getElementById('debugFile').value = config.logging?.debug_file ?? '~/.claude/smart-notify-debug.log';
}

// Populate sound selector dropdowns
function populateSoundSelectors() {
    const selectors = [
        'defaultSound',
        'permissionSound',
        'questionSound',
        'inactivitySound'
    ];

    selectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (!select) return;

        select.innerHTML = '';
        SYSTEM_SOUNDS.forEach(sound => {
            const option = document.createElement('option');
            option.value = sound;
            const name = sound.split('/').pop().replace('.aiff', '');
            option.textContent = name;
            select.appendChild(option);
        });
    });
}

// Build config object from form
function buildConfigFromForm() {
    return {
        sound: {
            enabled: document.getElementById('soundEnabled').checked,
            file: document.getElementById('defaultSound').value,
            random: document.getElementById('randomEnabled').checked,
            available_sounds: getAvailableSoundsFromList(),
            project_sounds: getProjectSoundsFromList(),
            event_sounds: {
                permission: document.getElementById('permissionSound').value,
                question: document.getElementById('questionSound').value,
                inactivity: document.getElementById('inactivitySound').value
            },
            min_interval: parseInt(document.getElementById('minInterval').value)
        },
        notifications: {
            audio: {
                enabled: document.getElementById('audioNotifEnabled').checked
            },
            terminal_notifier: {
                enabled: document.getElementById('terminalNotifEnabled').checked,
                title: document.getElementById('notifTitle').value,
                subtitle: document.getElementById('notifSubtitle').value
            },
            messages: {
                permission: document.getElementById('permissionMsg').value,
                question: document.getElementById('questionMsg').value,
                inactivity: document.getElementById('inactivityMsg').value
            },
            ntfy: {
                enabled: document.getElementById('ntfyEnabled').checked,
                topic: document.getElementById('ntfyTopic').value,
                server: document.getElementById('ntfyServer').value,
                priority: document.getElementById('ntfyPriority').value
            }
        },
        inactivity: {
            enabled: document.getElementById('inactivityEnabled').checked,
            timeout: parseInt(document.getElementById('inactivityTimeout').value),
            message: document.getElementById('inactivityMessage').value
        },
        logging: {
            log_questions: document.getElementById('logQuestionsEnabled').checked,
            log_file: document.getElementById('logFile').value,
            debug: document.getElementById('debugEnabled').checked,
            debug_file: document.getElementById('debugFile').value
        }
    };
}

// Save configuration
async function saveConfiguration() {
    try {
        const config = buildConfigFromForm();
        await invoke('save_config', { config });
        alert('Configuration saved successfully!');
    } catch (error) {
        console.error('Failed to save configuration:', error);
        alert('Failed to save configuration: ' + error);
    }
}

// Import configuration
async function importConfiguration() {
    try {
        const config = await invoke('import_config');
        currentConfig = config;
        populateFormFromConfig(config);
        alert('Configuration imported successfully!');
    } catch (error) {
        console.error('Failed to import configuration:', error);
        alert('Failed to import configuration: ' + error);
    }
}

// Reset to defaults
async function resetToDefaults() {
    if (!confirm('Are you sure you want to reset to default settings? This cannot be undone.')) {
        return;
    }

    try {
        const config = await invoke('reset_to_defaults');
        currentConfig = config;
        populateFormFromConfig(config);
        alert('Configuration reset to defaults!');
    } catch (error) {
        console.error('Failed to reset configuration:', error);
        alert('Failed to reset configuration: ' + error);
    }
}

// Preview sound
async function previewSound(soundPath) {
    try {
        await invoke('preview_sound', { soundPath });
    } catch (error) {
        console.error('Failed to preview sound:', error);
    }
}

// Add custom sound
async function addCustomSound() {
    try {
        const soundPath = await invoke('select_sound_file');
        if (soundPath) {
            addSoundToList(soundPath);
        }
    } catch (error) {
        console.error('Failed to add sound:', error);
    }
}

// Add sound to list UI
function addSoundToList(soundPath) {
    const soundList = document.getElementById('availableSounds');
    const soundItem = document.createElement('div');
    soundItem.className = 'sound-item';

    const soundName = document.createElement('span');
    soundName.className = 'sound-item-path';
    soundName.textContent = soundPath;

    const actions = document.createElement('div');
    actions.className = 'sound-item-actions';

    const previewBtn = document.createElement('button');
    previewBtn.className = 'btn-icon';
    previewBtn.textContent = '▶️';
    previewBtn.onclick = () => previewSound(soundPath);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-icon';
    removeBtn.textContent = '✕';
    removeBtn.onclick = () => soundItem.remove();

    actions.appendChild(previewBtn);
    actions.appendChild(removeBtn);
    soundItem.appendChild(soundName);
    soundItem.appendChild(actions);
    soundList.appendChild(soundItem);
}

// Get available sounds from list
function getAvailableSoundsFromList() {
    const soundItems = document.querySelectorAll('#availableSounds .sound-item');
    return Array.from(soundItems).map(item => item.querySelector('.sound-item-path').textContent);
}

// Add project mapping
function addProjectMapping() {
    const projectName = prompt('Enter project name:');
    if (projectName) {
        addProjectMappingToList(projectName, SYSTEM_SOUNDS[0]);
    }
}

// Add project mapping to list UI
function addProjectMappingToList(projectName, soundPath) {
    const projectSounds = document.getElementById('projectSounds');
    const projectItem = document.createElement('div');
    projectItem.className = 'project-item';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = projectName;
    nameInput.placeholder = 'Project name';

    const soundSelect = document.createElement('select');
    SYSTEM_SOUNDS.forEach(sound => {
        const option = document.createElement('option');
        option.value = sound;
        option.textContent = sound.split('/').pop().replace('.aiff', '');
        if (sound === soundPath) option.selected = true;
        soundSelect.appendChild(option);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-icon';
    removeBtn.textContent = '✕';
    removeBtn.onclick = () => projectItem.remove();

    projectItem.appendChild(nameInput);
    projectItem.appendChild(soundSelect);
    projectItem.appendChild(removeBtn);
    projectSounds.appendChild(projectItem);
}

// Get project sounds from list
function getProjectSoundsFromList() {
    const projectItems = document.querySelectorAll('#projectSounds .project-item');
    const projectSounds = {};

    projectItems.forEach(item => {
        const name = item.querySelector('input').value;
        const sound = item.querySelector('select').value;
        if (name) {
            projectSounds[name] = sound;
        }
    });

    return projectSounds;
}
