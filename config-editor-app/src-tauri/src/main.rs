// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;
use chrono::Utc;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

// ===== Config Structures =====

#[derive(Debug, Serialize, Deserialize, Clone)]
struct EventSounds {
    notification: String,
    stop: String,
    pre_tool_use: String,
    post_tool_use: String,
    subagent_stop: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ProjectConfig {
    path: String,
    #[serde(default)]
    display_name: Option<String>,
    enabled: bool,
    event_sounds: EventSounds,
    #[serde(default = "default_event_enabled")]
    event_enabled: EventEnabled,
    #[serde(default = "default_event_voice_enabled")]
    voice_enabled: EventEnabled,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct EventEnabled {
    notification: bool,
    stop: bool,
    pre_tool_use: bool,
    post_tool_use: bool,
    subagent_stop: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct GlobalSettings {
    enabled: bool,
    event_sounds: EventSounds,
    #[serde(default = "default_event_enabled")]
    event_enabled: EventEnabled,
    #[serde(default = "default_event_voice_enabled")]
    voice_enabled: EventEnabled,
    #[serde(default = "default_voice_template")]
    voice_template: String,
    #[serde(default = "default_voice_provider")]
    voice_provider: String,
    #[serde(default)]
    voice_id: Option<String>,
    #[serde(default)]
    fish_audio_api_key: Option<String>,
    #[serde(default)]
    respect_do_not_disturb: bool,
}

fn default_event_enabled() -> EventEnabled {
    EventEnabled {
        notification: true,
        stop: true,
        pre_tool_use: false,
        post_tool_use: false,
        subagent_stop: true,
    }
}

fn default_event_voice_enabled() -> EventEnabled {
    EventEnabled {
        notification: true,
        stop: true,
        pre_tool_use: false,
        post_tool_use: false,
        subagent_stop: true,
    }
}

fn default_voice_template() -> String {
    "{event} event".to_string()
}

fn default_voice_provider() -> String {
    "system".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Config {
    global_mode: bool,
    global_settings: GlobalSettings,
    projects: Vec<ProjectConfig>,
    sound_library: Vec<String>,
    min_interval: u32,
    debug: bool,
}

impl Default for Config {
    fn default() -> Self {
        let system_sounds = vec![
            "/System/Library/Sounds/Ping.aiff".to_string(),
            "/System/Library/Sounds/Glass.aiff".to_string(),
            "/System/Library/Sounds/Hero.aiff".to_string(),
            "/System/Library/Sounds/Submarine.aiff".to_string(),
            "/System/Library/Sounds/Tink.aiff".to_string(),
            "/System/Library/Sounds/Pop.aiff".to_string(),
            "/System/Library/Sounds/Funk.aiff".to_string(),
            "/System/Library/Sounds/Purr.aiff".to_string(),
            "/System/Library/Sounds/Blow.aiff".to_string(),
            "/System/Library/Sounds/Bottle.aiff".to_string(),
            "/System/Library/Sounds/Frog.aiff".to_string(),
            "/System/Library/Sounds/Basso.aiff".to_string(),
        ];

        Config {
            global_mode: true,
            global_settings: GlobalSettings {
                enabled: true,
                event_sounds: EventSounds {
                    notification: "voice:simple".to_string(),
                    stop: "voice:simple".to_string(),
                    pre_tool_use: "voice:simple".to_string(),
                    post_tool_use: "voice:simple".to_string(),
                    subagent_stop: "voice:simple".to_string(),
                },
                event_enabled: default_event_enabled(),
                voice_enabled: default_event_voice_enabled(),
                voice_template: default_voice_template(),
                voice_provider: "fish_audio".to_string(),
                voice_id: None,
                fish_audio_api_key: None,
                respect_do_not_disturb: false,
            },
            projects: vec![],
            sound_library: system_sounds,
            min_interval: 2,
            debug: false,
        }
    }
}

// ===== Installation Manifest =====

#[derive(Debug, Serialize, Deserialize, Clone)]
struct InstallationManifest {
    installed_at: String,
    backup_path: String,
    app_version: String,
    changes: InstallationChanges,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct InstallationChanges {
    files_created: Vec<String>,
    hooks_added: Vec<String>,
    existing_hooks_preserved: Vec<String>,
}

// ===== Helper Functions =====

fn get_config_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap();
    PathBuf::from(home).join(".claude/audio-notifier.yaml")
}

fn get_sounds_enabled_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap();
    PathBuf::from(home).join(".claude/.sounds-enabled")
}

fn get_custom_sounds_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap();
    PathBuf::from(home).join(".claude/sounds")
}

fn get_voice_cache_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap();
    PathBuf::from(home).join(".claude/voices")
}

fn hash_string(s: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    format!("{:x}", hasher.finalize())
}

// ===== Voice Generation =====

async fn generate_voice_fish_audio(
    text: &str,
    api_key: &str,
    voice_id: Option<&str>,
) -> Result<Vec<u8>, String> {
    let client = reqwest::Client::new();

    let voice = voice_id.unwrap_or("af_bella"); // Default voice

    let response = client
        .post("https://api.fish.audio/v1/tts")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "text": text,
            "reference_id": voice,
            "format": "mp3",
            "latency": "normal"
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to call Fish Audio API: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Fish Audio API error {}: {}", status, error_text));
    }

    response
        .bytes()
        .await
        .map(|b| b.to_vec())
        .map_err(|e| format!("Failed to read response: {}", e))
}

fn generate_voice_system_tts(text: &str) -> Result<Vec<u8>, String> {
    #[cfg(target_os = "macos")]
    {
        // Use macOS 'say' command to generate audio file
        let temp_path = std::env::temp_dir().join(format!("tts_{}.aiff", hash_string(text)));

        let output = Command::new("say")
            .arg("-o")
            .arg(&temp_path)
            .arg(text)
            .output()
            .map_err(|e| format!("Failed to run 'say' command: {}", e))?;

        if !output.status.success() {
            return Err(format!("'say' command failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let bytes = fs::read(&temp_path)
            .map_err(|e| format!("Failed to read generated audio: {}", e))?;

        // Clean up temp file
        let _ = fs::remove_file(&temp_path);

        Ok(bytes)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("System TTS is only supported on macOS".to_string())
    }
}

// ===== Tauri Commands =====

#[tauri::command]
async fn load_config() -> Result<Config, String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        return Ok(Config::default());
    }

    let contents = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    // Try to parse as new config format first
    match serde_yaml::from_str::<Config>(&contents) {
        Ok(config) => Ok(config),
        Err(_) => {
            // If parsing fails, return default config (migration from old format)
            let default_config = Config::default();
            // Save the default config to migrate the file
            save_config(default_config.clone()).await?;
            Ok(default_config)
        }
    }
}

#[tauri::command]
async fn save_config(config: Config) -> Result<(), String> {
    let config_path = get_config_path();

    // Ensure directory exists
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let yaml = serde_yaml::to_string(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, yaml)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn get_sounds_enabled() -> Result<bool, String> {
    Ok(get_sounds_enabled_path().exists())
}

#[tauri::command]
async fn set_sounds_enabled(enabled: bool) -> Result<(), String> {
    let path = get_sounds_enabled_path();

    if enabled {
        // Create the file
        fs::write(&path, "")
            .map_err(|e| format!("Failed to enable sounds: {}", e))?;
    } else {
        // Remove the file if it exists
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to disable sounds: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
async fn was_uninstalled() -> Result<bool, String> {
    let home = env::var("HOME")
        .map_err(|_| "Failed to get HOME directory".to_string())?;
    let claude_dir = PathBuf::from(&home).join(".claude");
    let uninstalled_marker = claude_dir.join(".uninstalled");
    Ok(uninstalled_marker.exists())
}

#[tauri::command]
async fn preview_sound(sound_path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("afplay")
            .arg(&sound_path)
            .spawn()
            .map_err(|e| format!("Failed to play sound: {}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        return Err("Sound preview is only supported on macOS".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn preview_voice(text: String, api_key: Option<String>, app_handle: tauri::AppHandle) -> Result<(), String> {
    println!("preview_voice called with text: {}", text);

    // Map text to bundled file name for basic events
    let bundled_file_name = match text.as_str() {
        "notification event" => Some("notification.mp3"),
        "stop event" => Some("stop.mp3"),
        "pre tool use event" => Some("pre_tool_use.mp3"),
        "post tool use event" => Some("post_tool_use.mp3"),
        "subagent stop event" => Some("subagent_stop.mp3"),
        _ => None,
    };

    // Check for bundled voice file first (for basic events)
    if let Some(filename) = bundled_file_name {
        let resource_path = app_handle
            .path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?
            .join("resources")
            .join("voices")
            .join(filename);

        if resource_path.exists() {
            println!("Playing bundled voice file: {:?}", resource_path);
            #[cfg(target_os = "macos")]
            {
                Command::new("afplay")
                    .arg(&resource_path)
                    .spawn()
                    .map_err(|e| format!("Failed to play bundled voice: {}", e))?;
            }
            return Ok(());
        } else {
            println!("Bundled file not found at {:?}", resource_path);
        }

        // Check for installed global voice file (from installation)
        let voice_cache_dir = get_voice_cache_dir();
        let global_file = voice_cache_dir.join("global").join(filename);

        if global_file.exists() {
            println!("Playing installed global voice file: {:?}", global_file);
            #[cfg(target_os = "macos")]
            {
                Command::new("afplay")
                    .arg(&global_file)
                    .spawn()
                    .map_err(|e| format!("Failed to play global voice: {}", e))?;
            }
            return Ok(());
        } else {
            println!("Global voice file not found at {:?}", global_file);
        }
    }

    // Check for cached file (for project-specific voices)
    let text_hash = hash_string(&text);
    let voice_cache_dir = get_voice_cache_dir();
    let cached_file = voice_cache_dir.join("previews").join(format!("{}.mp3", text_hash));

    if cached_file.exists() {
        println!("Playing cached voice file: {:?}", cached_file);
        #[cfg(target_os = "macos")]
        {
            Command::new("afplay")
                .arg(&cached_file)
                .spawn()
                .map_err(|e| format!("Failed to play cached voice: {}", e))?;
        }
        return Ok(());
    }

    println!("No bundled or cached file found, generating new voice");

    // Generate voice file for project-specific text
    let audio_bytes = if let Some(key) = api_key {
        generate_voice_fish_audio(&text, &key, Some("af_bella")).await?
    } else {
        // Use system TTS as fallback
        #[cfg(target_os = "macos")]
        {
            generate_voice_system_tts(&text)?
        }
        #[cfg(not(target_os = "macos"))]
        {
            return Err("No API key provided and system TTS not available".to_string());
        }
    };

    // Cache the generated file
    fs::create_dir_all(cached_file.parent().unwrap())
        .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    fs::write(&cached_file, &audio_bytes)
        .map_err(|e| format!("Failed to cache voice file: {}", e))?;

    // Play the file
    #[cfg(target_os = "macos")]
    {
        Command::new("afplay")
            .arg(&cached_file)
            .spawn()
            .map_err(|e| format!("Failed to play voice: {}", e))?;
    }

    println!("Voice preview completed successfully");
    Ok(())
}

// ===== Installation Safety Functions =====

fn get_manifest_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap();
    PathBuf::from(home).join(".claude/audio-notifier-install.json")
}

fn get_backup_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap();
    PathBuf::from(home).join(".claude/backups")
}

fn check_existing_hooks(settings: &serde_json::Value) -> Vec<String> {
    let mut existing_hooks = Vec::new();

    if let Some(hooks) = settings.get("hooks").and_then(|h| h.as_object()) {
        for (hook_type, _) in hooks {
            existing_hooks.push(hook_type.clone());
        }
    }

    existing_hooks
}

fn create_backup(settings_file: &PathBuf) -> Result<String, String> {
    if !settings_file.exists() {
        return Ok(String::new()); // No backup needed if no settings exist
    }

    let backup_dir = get_backup_dir();
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;

    let timestamp = Utc::now().timestamp();
    let backup_filename = format!("settings-pre-audio-notifier-{}.json", timestamp);
    let backup_path = backup_dir.join(&backup_filename);

    fs::copy(settings_file, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    Ok(backup_path.to_str().unwrap().to_string())
}

fn merge_hooks(existing_hooks: &serde_json::Value, our_hooks: serde_json::Value) -> serde_json::Value {
    let mut merged = our_hooks.clone();

    // If existing hooks exist, merge them
    if let Some(existing) = existing_hooks.as_object() {
        if let Some(merged_obj) = merged.as_object_mut() {
            for (hook_type, hook_data) in existing {
                // Check if these are our hooks by looking for smart-notify.sh
                let is_our_hook = hook_data
                    .as_array()
                    .map(|arr| {
                        arr.iter().any(|item| {
                            item.get("hooks")
                                .and_then(|h| h.as_array())
                                .map(|hooks| {
                                    hooks.iter().any(|h| {
                                        h.get("command")
                                            .and_then(|c| c.as_str())
                                            .map(|cmd| cmd.contains("smart-notify.sh"))
                                            .unwrap_or(false)
                                    })
                                })
                                .unwrap_or(false)
                        })
                    })
                    .unwrap_or(false);

                // If not our hooks, preserve them by merging
                if !is_our_hook {
                    if let Some(our_hook_data) = merged_obj.get_mut(hook_type) {
                        if let (Some(existing_arr), Some(our_arr)) = (hook_data.as_array(), our_hook_data.as_array_mut()) {
                            // Append existing hooks to our hooks
                            for item in existing_arr {
                                our_arr.push(item.clone());
                            }
                        }
                    } else {
                        // Hook type doesn't exist in our config, add it entirely
                        merged_obj.insert(hook_type.clone(), hook_data.clone());
                    }
                }
            }
        }
    }

    merged
}

fn create_installation_manifest(
    backup_path: String,
    files_created: Vec<String>,
    hooks_added: Vec<String>,
    existing_hooks_preserved: Vec<String>,
) -> Result<(), String> {
    let manifest = InstallationManifest {
        installed_at: Utc::now().to_rfc3339(),
        backup_path,
        app_version: "1.0.0".to_string(),
        changes: InstallationChanges {
            files_created,
            hooks_added,
            existing_hooks_preserved,
        },
    };

    let manifest_path = get_manifest_path();
    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;

    fs::write(&manifest_path, manifest_json)
        .map_err(|e| format!("Failed to write manifest: {}", e))?;

    Ok(())
}

// Helper function to recursively copy directories
fn copy_dir_recursive(src: &PathBuf, dest: &PathBuf) -> std::io::Result<()> {
    fs::create_dir_all(dest)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dest_path)?;
        } else {
            fs::copy(&src_path, &dest_path)?;

            // Preserve executable permissions on macOS/Linux
            #[cfg(unix)]
            {
                
                let perms = fs::metadata(&src_path)?.permissions();
                fs::set_permissions(&dest_path, perms)?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
async fn install_hooks(app_handle: tauri::AppHandle) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "Could not get HOME directory")?;
    let claude_dir = PathBuf::from(&home).join(".claude");
    let scripts_dir = claude_dir.join("scripts");

    // Remove .uninstalled marker if it exists (user is reinstalling)
    let uninstalled_marker = claude_dir.join(".uninstalled");
    if uninstalled_marker.exists() {
        fs::remove_file(&uninstalled_marker).ok(); // Ignore errors
    }

    // Create directories
    fs::create_dir_all(&scripts_dir)
        .map_err(|e| format!("Failed to create .claude/scripts directory: {}", e))?;

    // Copy scripts from bundled resources
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    let bundled_scripts = resource_dir.join("resources").join("scripts");

    if !bundled_scripts.exists() {
        return Err(format!("Bundled scripts not found at {:?}", bundled_scripts));
    }

    // Copy each script file (force overwrite for upgrades)
    for entry in fs::read_dir(&bundled_scripts)
        .map_err(|e| format!("Failed to read bundled scripts: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read script entry: {}", e))?;
        let src = entry.path();
        if src.is_file() {
            let filename = src.file_name().ok_or("Invalid filename")?;
            let dest = scripts_dir.join(filename);

            // Remove existing file first to ensure clean upgrade (preserves user config/sounds)
            if dest.exists() {
                fs::remove_file(&dest)
                    .map_err(|e| format!("Failed to remove old {:?}: {}", filename, e))?;
            }

            fs::copy(&src, &dest)
                .map_err(|e| format!("Failed to copy {:?}: {}", filename, e))?;

            // Make scripts executable
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = fs::metadata(&dest)
                    .map_err(|e| format!("Failed to get permissions: {}", e))?
                    .permissions();
                perms.set_mode(0o755);
                fs::set_permissions(&dest, perms)
                    .map_err(|e| format!("Failed to set permissions: {}", e))?;
            }
        }
    }

    // Copy bundled voice files to ~/.claude/voices/global/
    let voices_dir = claude_dir.join("voices").join("global");
    fs::create_dir_all(&voices_dir)
        .map_err(|e| format!("Failed to create voices directory: {}", e))?;

    let bundled_voices = resource_dir.join("resources").join("voices");
    if bundled_voices.exists() {
        for entry in fs::read_dir(&bundled_voices)
            .map_err(|e| format!("Failed to read bundled voices: {}", e))? {
            let entry = entry.map_err(|e| format!("Failed to read voice entry: {}", e))?;
            let src = entry.path();
            if src.is_file() {
                let filename = src.file_name().ok_or("Invalid voice filename")?;
                let dest = voices_dir.join(filename);

                // Remove existing voice file first to ensure upgrade
                if dest.exists() {
                    fs::remove_file(&dest)
                        .map_err(|e| format!("Failed to remove old voice {:?}: {}", filename, e))?;
                }

                fs::copy(&src, &dest)
                    .map_err(|e| format!("Failed to copy voice {:?}: {}", filename, e))?;
            }
        }
    }

    // Copy terminal-notifier.app to ~/.claude/terminal-notifier.app
    let bundled_terminal_notifier = resource_dir.join("resources").join("terminal-notifier").join("terminal-notifier.app");
    if bundled_terminal_notifier.exists() {
        let dest_terminal_notifier = claude_dir.join("terminal-notifier.app");

        // Remove existing terminal-notifier if present
        if dest_terminal_notifier.exists() {
            fs::remove_dir_all(&dest_terminal_notifier)
                .map_err(|e| format!("Failed to remove existing terminal-notifier: {}", e))?;
        }

        // Copy the entire .app bundle
        copy_dir_recursive(&bundled_terminal_notifier, &dest_terminal_notifier)
            .map_err(|e| format!("Failed to copy terminal-notifier: {}", e))?;
    }

    // Update settings.json with hooks (with safety features)
    let settings_file = claude_dir.join("settings.json");

    // Load existing settings
    let mut settings: serde_json::Value = if settings_file.exists() {
        let contents = fs::read_to_string(&settings_file)
            .map_err(|e| format!("Failed to read settings.json: {}", e))?;
        serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse settings.json: {}", e))?
    } else {
        serde_json::json!({})
    };

    // Check for existing hooks
    let existing_hooks_list = check_existing_hooks(&settings);
    let had_existing_hooks = !existing_hooks_list.is_empty();

    // Create backup before making changes
    let backup_path = create_backup(&settings_file)?;

    // Store old hooks value for merging
    let old_hooks = settings.get("hooks").cloned().unwrap_or(serde_json::json!({}));

    // Add our hooks configuration
    let our_hooks_config = serde_json::json!({
        "Notification": [{
            "matcher": "",
            "hooks": [{
                "type": "command",
                "command": format!("bash {}/.claude/scripts/smart-notify.sh notification", home)
            }]
        }],
        "Stop": [{
            "matcher": ".*",
            "hooks": [
                {
                    "type": "command",
                    "command": format!("jq -c -r '.' >> {}/.claude/stop-input.jsonl || cat >> {}/.claude/stop-input.jsonl", home, home)
                },
                {
                    "type": "command",
                    "command": format!("bash {}/.claude/scripts/smart-notify.sh stop", home)
                }
            ]
        }],
        "PreToolUse": [{
            "matcher": "",
            "hooks": [{
                "type": "command",
                "command": format!("bash {}/.claude/scripts/smart-notify.sh pre_tool_use", home)
            }]
        }],
        "PostToolUse": [{
            "matcher": "",
            "hooks": [{
                "type": "command",
                "command": format!("bash {}/.claude/scripts/smart-notify.sh post_tool_use", home)
            }]
        }],
        "SubagentStop": [{
            "matcher": "",
            "hooks": [{
                "type": "command",
                "command": format!("bash {}/.claude/scripts/smart-notify.sh subagent_stop", home)
            }]
        }]
    });

    // Merge with existing hooks (preserve non-smart-notify hooks)
    let merged_hooks = merge_hooks(&old_hooks, our_hooks_config);
    settings["hooks"] = merged_hooks;

    // Track files created
    let mut files_created = vec![
        format!("{}/.claude/scripts/smart-notify.sh", home),
        format!("{}/.claude/scripts/select-sound.sh", home),
        format!("{}/.claude/scripts/read-config.sh", home),
        format!("{}/.claude/scripts/audio-notifier-uninstall.sh", home),
        format!("{}/.claude/.sounds-enabled", home),
    ];

    // Track voice files if they were created
    if voices_dir.exists() {
        if let Ok(entries) = fs::read_dir(&voices_dir) {
            for entry in entries.flatten() {
                if let Some(path_str) = entry.path().to_str().map(|s| s.to_string()) {
                    files_created.push(path_str);
                }
            }
        }
    }

    // Track terminal-notifier if it was installed
    let terminal_notifier_path = claude_dir.join("terminal-notifier.app");
    if terminal_notifier_path.exists() {
        files_created.push(format!("{}/.claude/terminal-notifier.app", home));
    }

    // Identify which hooks we added
    let hooks_added = vec![
        "Notification".to_string(),
        "Stop".to_string(),
        "PreToolUse".to_string(),
        "PostToolUse".to_string(),
        "SubagentStop".to_string(),
    ];

    // Identify existing hooks we preserved
    let existing_hooks_preserved: Vec<String> = if had_existing_hooks {
        existing_hooks_list
            .into_iter()
            .filter(|h| !hooks_added.contains(h))
            .collect()
    } else {
        vec![]
    };

    // Save updated settings
    let settings_str = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_file, settings_str)
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;

    // Enable sounds
    let sounds_enabled_file = claude_dir.join(".sounds-enabled");
    fs::write(&sounds_enabled_file, "")
        .map_err(|e| format!("Failed to enable sounds: {}", e))?;

    // Create default config if it doesn't exist
    let config_file = claude_dir.join("audio-notifier.yaml");
    if !config_file.exists() {
        let default_config = Config::default();
        let yaml = serde_yaml::to_string(&default_config)
            .map_err(|e| format!("Failed to serialize default config: {}", e))?;
        fs::write(&config_file, yaml)
            .map_err(|e| format!("Failed to create default config: {}", e))?;
        files_created.push(format!("{}/.claude/audio-notifier.yaml", home));
    }

    // Create installation manifest
    create_installation_manifest(
        backup_path,
        files_created,
        hooks_added,
        existing_hooks_preserved.clone(),
    )?;

    let mut result_message = "Installation complete! Audio notifications are now active.".to_string();
    if had_existing_hooks {
        result_message.push_str(&format!(
            "\n\nExisting hooks preserved: {}",
            existing_hooks_preserved.join(", ")
        ));
    }

    Ok(result_message)
}

#[tauri::command]
async fn upload_sound(source_path: String) -> Result<String, String> {
    // Copy the selected file to ~/.claude/sounds/
    let sounds_dir = get_custom_sounds_dir();
    fs::create_dir_all(&sounds_dir)
        .map_err(|e| format!("Failed to create sounds directory: {}", e))?;

    let source = PathBuf::from(&source_path);
    let filename = source.file_name()
        .ok_or("Invalid source file path")?;
    let dest_path = sounds_dir.join(filename);

    // Copy the file
    fs::copy(&source, &dest_path)
        .map_err(|e| format!("Failed to copy sound file: {}", e))?;

    // Return the permanent path
    dest_path.to_str()
        .ok_or("Invalid destination path".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
async fn get_recent_projects() -> Result<Vec<String>, String> {
    let home = std::env::var("HOME").unwrap();
    let log_path = PathBuf::from(&home).join(".claude/claude-output.log");

    if !log_path.exists() {
        return Ok(vec![]);
    }

    let contents = fs::read_to_string(&log_path)
        .map_err(|e| format!("Failed to read log file: {}", e))?;

    // Parse the log to find working directories
    // Look for lines like "Working directory: /path/to/project"
    let mut projects: Vec<String> = contents
        .lines()
        .filter(|line| line.contains("Working directory:") || line.starts_with("/"))
        .filter_map(|line| {
            if line.contains("Working directory:") {
                line.split("Working directory:").nth(1).map(|s| s.trim().to_string())
            } else if line.starts_with("/") && line.contains("Development") {
                Some(line.trim().to_string())
            } else {
                None
            }
        })
        .collect();

    // Remove duplicates and limit to 10 most recent
    projects.dedup();
    projects.truncate(10);

    Ok(projects)
}

#[tauri::command]
async fn open_log_file() -> Result<(), String> {
    let home = std::env::var("HOME").unwrap();
    let log_path = format!("{}/.claude/smart-notify-debug.log", home);

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("Failed to open log file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn list_custom_sounds() -> Result<Vec<String>, String> {
    let sounds_dir = get_custom_sounds_dir();

    if !sounds_dir.exists() {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(&sounds_dir)
        .map_err(|e| format!("Failed to read sounds directory: {}", e))?;

    let mut sounds = vec![];
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext == "aiff" || ext == "wav" || ext == "mp3" {
                    if let Some(path_str) = path.to_str() {
                        sounds.push(path_str.to_string());
                    }
                }
            }
        }
    }

    Ok(sounds)
}

#[tauri::command]
async fn pregenerate_basic_voices(api_key: String) -> Result<String, String> {
    let voice_cache_dir = get_voice_cache_dir();
    let preview_dir = voice_cache_dir.join("previews");
    fs::create_dir_all(&preview_dir)
        .map_err(|e| format!("Failed to create preview directory: {}", e))?;

    let basic_texts = vec![
        "notification event",
        "stop event",
        "pre tool use event",
        "post tool use event",
        "subagent stop event",
    ];

    for text in basic_texts {
        let text_hash = hash_string(text);
        let cached_file = preview_dir.join(format!("{}.mp3", text_hash));

        if cached_file.exists() {
            println!("Skipping {}, already cached", text);
            continue;
        }

        println!("Generating voice for: {}", text);
        let audio_bytes = generate_voice_fish_audio(text, &api_key, Some("af_bella")).await?;
        fs::write(&cached_file, audio_bytes)
            .map_err(|e| format!("Failed to write voice file: {}", e))?;
    }

    Ok("Pre-generated 4 basic voice files".to_string())
}

#[tauri::command]
async fn generate_voice_notifications(config: Config, api_key: Option<String>) -> Result<String, String> {
    let voice_cache_dir = get_voice_cache_dir();

    // Create cache directories
    fs::create_dir_all(&voice_cache_dir)
        .map_err(|e| format!("Failed to create voice cache directory: {}", e))?;

    let mut generated_count = 0;

    // Generate global voice notifications
    if config.global_mode {
        let global_dir = voice_cache_dir.join("global");
        fs::create_dir_all(&global_dir)
            .map_err(|e| format!("Failed to create global voice directory: {}", e))?;

        let events = vec![
            ("notification", "notification"),
            ("stop", "stop"),
            ("pre_tool_use", "pre tool use"),
            ("post_tool_use", "post tool use"),
            ("subagent_stop", "subagent stop"),
        ];

        for (event_key, event_name) in events {
            let voice_enabled = match event_key {
                "notification" => config.global_settings.voice_enabled.notification,
                "stop" => config.global_settings.voice_enabled.stop,
                "pre_tool_use" => config.global_settings.voice_enabled.pre_tool_use,
                "post_tool_use" => config.global_settings.voice_enabled.post_tool_use,
                "subagent_stop" => config.global_settings.voice_enabled.subagent_stop,
                _ => false,
            };

            if !voice_enabled {
                continue;
            }

            let text = config.global_settings.voice_template
                .replace("{event}", event_name)
                .replace("{project}", "");

            let audio_bytes = match config.global_settings.voice_provider.as_str() {
                "fish-audio" => {
                    let api_key = api_key.as_ref().ok_or("Fish Audio API key required")?;
                    generate_voice_fish_audio(&text, api_key, config.global_settings.voice_id.as_deref()).await?
                },
                "system" | _ => {
                    generate_voice_system_tts(&text)?
                }
            };

            let file_path = global_dir.join(format!("{}.mp3", event_key));
            fs::write(&file_path, audio_bytes)
                .map_err(|e| format!("Failed to write voice file: {}", e))?;

            generated_count += 1;
        }
    }

    // Generate project-specific voice notifications
    for project in &config.projects {
        let project_hash = hash_string(&project.path);
        let project_dir = voice_cache_dir.join("projects").join(&project_hash);
        fs::create_dir_all(&project_dir)
            .map_err(|e| format!("Failed to create project voice directory: {}", e))?;

        let events = vec![
            ("notification", "notification"),
            ("stop", "stop"),
            ("pre_tool_use", "pre tool use"),
            ("post_tool_use", "post tool use"),
            ("subagent_stop", "subagent stop"),
        ];

        for (event_key, event_name) in events {
            let voice_enabled = match event_key {
                "notification" => project.voice_enabled.notification,
                "stop" => project.voice_enabled.stop,
                "pre_tool_use" => project.voice_enabled.pre_tool_use,
                "post_tool_use" => project.voice_enabled.post_tool_use,
                "subagent_stop" => project.voice_enabled.subagent_stop,
                _ => false,
            };

            if !voice_enabled {
                continue;
            }

            let display_name = project.display_name.as_ref().unwrap_or(&project.path);
            let text = config.global_settings.voice_template
                .replace("{event}", event_name)
                .replace("{project}", display_name);

            let audio_bytes = match config.global_settings.voice_provider.as_str() {
                "fish-audio" => {
                    let api_key = api_key.as_ref().ok_or("Fish Audio API key required")?;
                    generate_voice_fish_audio(&text, api_key, config.global_settings.voice_id.as_deref()).await?
                },
                "system" | _ => {
                    generate_voice_system_tts(&text)?
                }
            };

            let file_path = project_dir.join(format!("{}.mp3", event_key));
            fs::write(&file_path, audio_bytes)
                .map_err(|e| format!("Failed to write voice file: {}", e))?;

            generated_count += 1;
        }
    }

    Ok(format!("Generated {} voice notifications", generated_count))
}

// ===== Uninstall Functions =====

#[tauri::command]
async fn get_installation_info() -> Result<InstallationManifest, String> {
    let manifest_path = get_manifest_path();

    if !manifest_path.exists() {
        return Err("Installation manifest not found. The application may not be installed.".to_string());
    }

    let contents = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read installation manifest: {}", e))?;

    let manifest: InstallationManifest = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse installation manifest: {}", e))?;

    Ok(manifest)
}

#[tauri::command]
async fn uninstall_hooks() -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "Could not get HOME directory")?;
    let claude_dir = PathBuf::from(&home).join(".claude");
    let settings_file = claude_dir.join("settings.json");

    // Read manifest to know what to remove
    let manifest = get_installation_info().await?;

    // Create backup before uninstalling
    let backup_path = create_backup(&settings_file)?;

    // Read settings
    if !settings_file.exists() {
        return Err("settings.json not found".to_string());
    }

    let contents = fs::read_to_string(&settings_file)
        .map_err(|e| format!("Failed to read settings.json: {}", e))?;
    let mut settings: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse settings.json: {}", e))?;

    // Remove only our hooks (those containing smart-notify.sh)
    if let Some(hooks) = settings.get_mut("hooks").and_then(|h| h.as_object_mut()) {
        for (_hook_type, hook_data) in hooks.iter_mut() {
            if let Some(hook_array) = hook_data.as_array_mut() {
                // Filter out entries that contain smart-notify.sh
                hook_array.retain(|item| {
                    !item
                        .get("hooks")
                        .and_then(|h| h.as_array())
                        .map(|hooks| {
                            hooks.iter().any(|h| {
                                h.get("command")
                                    .and_then(|c| c.as_str())
                                    .map(|cmd| cmd.contains("smart-notify.sh"))
                                    .unwrap_or(false)
                            })
                        })
                        .unwrap_or(false)
                });
            }
        }

        // Remove empty hook arrays
        hooks.retain(|_k, v| {
            v.as_array().map(|arr| !arr.is_empty()).unwrap_or(true)
        });
    }

    // Save updated settings
    let settings_str = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_file, settings_str)
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;

    // Remove scripts
    let scripts_to_remove = vec![
        "smart-notify.sh",
        "select-sound.sh",
        "read-config.sh",
    ];

    let scripts_dir = claude_dir.join("scripts");
    for script in scripts_to_remove {
        let script_path = scripts_dir.join(script);
        if script_path.exists() {
            fs::remove_file(&script_path)
                .map_err(|e| format!("Failed to remove {}: {}", script, e))?;
        }
    }

    // Remove .sounds-enabled
    let sounds_enabled_file = claude_dir.join(".sounds-enabled");
    if sounds_enabled_file.exists() {
        fs::remove_file(&sounds_enabled_file)
            .map_err(|e| format!("Failed to remove .sounds-enabled: {}", e))?;
    }

    // Remove global voice files
    let global_voices_dir = claude_dir.join("voices").join("global");
    if global_voices_dir.exists() {
        fs::remove_dir_all(&global_voices_dir)
            .map_err(|e| format!("Failed to remove global voices: {}", e))?;
    }

    // Remove terminal-notifier.app
    let terminal_notifier_dir = claude_dir.join("terminal-notifier.app");
    if terminal_notifier_dir.exists() {
        fs::remove_dir_all(&terminal_notifier_dir)
            .map_err(|e| format!("Failed to remove terminal-notifier: {}", e))?;
    }

    // Create .uninstalled marker to prevent auto-reinstall
    let uninstalled_marker = claude_dir.join(".uninstalled");
    fs::write(&uninstalled_marker, "")
        .map_err(|e| format!("Failed to create uninstall marker: {}", e))?;

    // Remove manifest
    let manifest_path = get_manifest_path();
    if manifest_path.exists() {
        fs::remove_file(&manifest_path)
            .map_err(|e| format!("Failed to remove manifest: {}", e))?;
    }

    let mut result = format!(
        "Uninstallation complete!\n\nBackup created at: {}\nConfig preserved at: ~/.claude/audio-notifier.yaml",
        backup_path
    );

    if !manifest.changes.existing_hooks_preserved.is_empty() {
        result.push_str(&format!(
            "\n\nYour existing hooks were preserved: {}",
            manifest.changes.existing_hooks_preserved.join(", ")
        ));
    }

    Ok(result)
}

#[tauri::command]
async fn export_installation_log() -> Result<String, String> {
    let manifest = get_installation_info().await?;
    let json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
    Ok(json)
}

#[tauri::command]
async fn get_backup_path() -> Result<String, String> {
    let manifest = get_installation_info().await?;
    Ok(manifest.backup_path)
}

#[tauri::command]
async fn export_diagnostics() -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "Could not get HOME directory")?;
    let claude_dir = PathBuf::from(&home).join(".claude");

    let mut diagnostics = serde_json::json!({
        "app_version": "1.0.0",
        "collected_at": chrono::Utc::now().to_rfc3339(),
    });

    // Get macOS version
    if let Ok(output) = Command::new("sw_vers").arg("-productVersion").output() {
        if let Ok(version) = String::from_utf8(output.stdout) {
            diagnostics["macos_version"] = serde_json::json!(version.trim());
        }
    }

    // Check script installation
    let scripts_dir = claude_dir.join("scripts");
    let smart_notify = scripts_dir.join("smart-notify.sh");
    diagnostics["scripts_installed"] = serde_json::json!({
        "smart_notify_exists": smart_notify.exists(),
        "smart_notify_executable": smart_notify.exists() &&
            fs::metadata(&smart_notify).map(|m| m.permissions().mode() & 0o111 != 0).unwrap_or(false),
    });

    // Check terminal-notifier availability
    let system_tn = Command::new("which").arg("terminal-notifier").output()
        .map(|o| o.status.success()).unwrap_or(false);
    let bundled_tn = claude_dir.join("terminal-notifier.app/Contents/MacOS/terminal-notifier");
    diagnostics["terminal_notifier"] = serde_json::json!({
        "system_installed": system_tn,
        "bundled_exists": bundled_tn.exists(),
    });

    // Get hook configuration
    let settings_file = claude_dir.join("settings.json");
    if settings_file.exists() {
        if let Ok(contents) = fs::read_to_string(&settings_file) {
            if let Ok(settings) = serde_json::from_str::<serde_json::Value>(&contents) {
                diagnostics["hooks_configured"] = settings.get("hooks").cloned().unwrap_or(serde_json::json!({}));
            }
        }
    }

    // Get recent activity log (last 10 entries)
    let activity_log = claude_dir.join("activity-log.json");
    if activity_log.exists() {
        if let Ok(contents) = fs::read_to_string(&activity_log) {
            if let Ok(events) = serde_json::from_str::<Vec<serde_json::Value>>(&contents) {
                let recent: Vec<_> = events.into_iter().rev().take(10).collect();
                diagnostics["recent_activity"] = serde_json::json!(recent);
            }
        }
    }

    // Get last 50 lines of hook execution log
    let hook_log = claude_dir.join("hook-execution.log");
    if hook_log.exists() {
        if let Ok(contents) = fs::read_to_string(&hook_log) {
            let lines: Vec<_> = contents.lines().rev().take(50).collect();
            let lines: Vec<_> = lines.into_iter().rev().collect();
            diagnostics["hook_execution_log"] = serde_json::json!(lines);
        }
    }

    // Get config (sanitize API keys)
    let config_file = claude_dir.join("audio-notifier.yaml");
    if config_file.exists() {
        if let Ok(contents) = fs::read_to_string(&config_file) {
            // Simple sanitization - replace API key values
            let sanitized = contents.lines()
                .map(|line| {
                    if line.contains("api_key:") || line.contains("fish_audio_api_key:") {
                        if let Some(pos) = line.find(':') {
                            format!("{}:  [REDACTED]", &line[..pos])
                        } else {
                            line.to_string()
                        }
                    } else {
                        line.to_string()
                    }
                })
                .collect::<Vec<_>>()
                .join("\n");
            diagnostics["config_yaml"] = serde_json::json!(sanitized);
        }
    }

    serde_json::to_string_pretty(&diagnostics)
        .map_err(|e| format!("Failed to serialize diagnostics: {}", e))
}

#[derive(Debug, Serialize, Deserialize)]
struct ActivityEvent {
    timestamp: String,
    event: String,
    audio: bool,
    visual: bool,
    message: Option<String>,
    full_message: Option<String>,
    project: Option<String>,
}

#[tauri::command]
async fn get_activity_log() -> Result<Vec<ActivityEvent>, String> {
    let home = std::env::var("HOME").map_err(|_| "Could not get HOME directory")?;
    let activity_log_path = PathBuf::from(&home).join(".claude/activity-log.json");

    if !activity_log_path.exists() {
        // Return empty array if log doesn't exist yet
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&activity_log_path)
        .map_err(|e| format!("Failed to read activity log: {}", e))?;

    let events: Vec<ActivityEvent> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse activity log: {}", e))?;

    // Return events in reverse order (most recent first)
    let mut reversed_events = events;
    reversed_events.reverse();

    Ok(reversed_events)
}

#[tauri::command]
async fn dev_reset_install() -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|_| "Could not get HOME directory")?;
    let claude_dir = PathBuf::from(&home).join(".claude");

    // Delete .sounds-enabled
    let sounds_enabled = claude_dir.join(".sounds-enabled");
    if sounds_enabled.exists() {
        fs::remove_file(&sounds_enabled)
            .map_err(|e| format!("Failed to remove .sounds-enabled: {}", e))?;
    }

    // Delete audio-notifier.yaml
    let config_file = claude_dir.join("audio-notifier.yaml");
    if config_file.exists() {
        fs::remove_file(&config_file)
            .map_err(|e| format!("Failed to remove audio-notifier.yaml: {}", e))?;
    }

    // Delete scripts
    let scripts_to_delete = vec![
        "smart-notify.sh",
        "select-sound.sh",
        "read-config.sh",
    ];

    let scripts_dir = claude_dir.join("scripts");
    for script in scripts_to_delete {
        let script_path = scripts_dir.join(script);
        if script_path.exists() {
            fs::remove_file(&script_path)
                .map_err(|e| format!("Failed to remove {}: {}", script, e))?;
        }
    }

    // Delete global voice files
    let global_voices_dir = claude_dir.join("voices").join("global");
    if global_voices_dir.exists() {
        fs::remove_dir_all(&global_voices_dir)
            .map_err(|e| format!("Failed to remove global voices: {}", e))?;
    }

    // Delete terminal-notifier.app
    let terminal_notifier_dir = claude_dir.join("terminal-notifier.app");
    if terminal_notifier_dir.exists() {
        fs::remove_dir_all(&terminal_notifier_dir)
            .map_err(|e| format!("Failed to remove terminal-notifier: {}", e))?;
    }

    // Remove hooks from settings.json
    let settings_file = claude_dir.join("settings.json");
    if settings_file.exists() {
        let contents = fs::read_to_string(&settings_file)
            .map_err(|e| format!("Failed to read settings.json: {}", e))?;

        if let Ok(mut settings) = serde_json::from_str::<serde_json::Value>(&contents) {
            if settings.get("hooks").is_some() {
                settings.as_object_mut().unwrap().remove("hooks");
                let settings_str = serde_json::to_string_pretty(&settings)
                    .map_err(|e| format!("Failed to serialize settings: {}", e))?;
                fs::write(&settings_file, settings_str)
                    .map_err(|e| format!("Failed to write settings.json: {}", e))?;
            }
        }
    }

    Ok(())
}

// ===== System Tray =====

fn create_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::{TrayIconBuilder, TrayIconEvent},
    };

    let toggle_i = MenuItem::with_id(app, "toggle", "Toggle Sounds", true, None::<&str>)?;
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&toggle_i, &settings_i, &quit_i])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => {
                tauri::async_runtime::block_on(async {
                    let enabled = get_sounds_enabled().await.unwrap_or(false);
                    let _ = set_sounds_enabled(!enabled).await;
                });
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                if let Some(app) = tray.app_handle().get_webview_window("main") {
                    let _ = app.show();
                    let _ = app.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

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

// ===== Main =====

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            create_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            get_sounds_enabled,
            set_sounds_enabled,
            was_uninstalled,
            preview_sound,
            preview_voice,
            pregenerate_basic_voices,
            install_hooks,
            upload_sound,
            get_recent_projects,
            open_log_file,
            list_custom_sounds,
            generate_voice_notifications,
            get_installation_info,
            uninstall_hooks,
            export_installation_log,
            get_backup_path,
            get_activity_log,
            export_diagnostics,
            dev_reset_install,
            open_focus_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
