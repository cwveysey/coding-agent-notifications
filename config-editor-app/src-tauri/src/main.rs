// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

// ===== Config Structures =====

#[derive(Debug, Serialize, Deserialize, Clone)]
struct EventSounds {
    notification: String,
    stop: String,
    post_tool_use: String,
    subagent_stop: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ProjectConfig {
    path: String,
    enabled: bool,
    event_sounds: EventSounds,
    #[serde(default = "default_event_enabled")]
    event_enabled: EventEnabled,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct EventEnabled {
    notification: bool,
    stop: bool,
    post_tool_use: bool,
    subagent_stop: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct GlobalSettings {
    enabled: bool,
    event_sounds: EventSounds,
    #[serde(default = "default_event_enabled")]
    event_enabled: EventEnabled,
}

fn default_event_enabled() -> EventEnabled {
    EventEnabled {
        notification: true,
        stop: true,
        post_tool_use: true,
        subagent_stop: true,
    }
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
                    notification: "/System/Library/Sounds/Glass.aiff".to_string(),
                    stop: "/System/Library/Sounds/Glass.aiff".to_string(),
                    post_tool_use: "/System/Library/Sounds/Glass.aiff".to_string(),
                    subagent_stop: "/System/Library/Sounds/Glass.aiff".to_string(),
                },
                event_enabled: default_event_enabled(),
            },
            projects: vec![],
            sound_library: system_sounds,
            min_interval: 2,
            debug: false,
        }
    }
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
async fn upload_sound() -> Result<Option<String>, String> {
    // This will be called from the frontend using the dialog plugin
    // For now, return None - the frontend will handle the dialog
    Ok(None)
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

// ===== Main =====

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            create_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            get_sounds_enabled,
            set_sounds_enabled,
            preview_sound,
            upload_sound,
            get_recent_projects,
            open_log_file,
            list_custom_sounds,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
