// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SoundConfig {
    enabled: bool,
    file: String,
    random: bool,
    available_sounds: Vec<String>,
    #[serde(default)]
    project_sounds: HashMap<String, String>,
    event_sounds: EventSounds,
    min_interval: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct EventSounds {
    permission: String,
    question: String,
    inactivity: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AudioNotification {
    enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct TerminalNotifierConfig {
    enabled: bool,
    title: String,
    subtitle: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct NotificationMessages {
    permission: String,
    question: String,
    inactivity: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct NtfyConfig {
    enabled: bool,
    topic: String,
    server: String,
    priority: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct NotificationsConfig {
    audio: AudioNotification,
    terminal_notifier: TerminalNotifierConfig,
    messages: NotificationMessages,
    ntfy: NtfyConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct InactivityConfig {
    enabled: bool,
    timeout: u32,
    message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LoggingConfig {
    log_questions: bool,
    log_file: String,
    debug: bool,
    debug_file: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Config {
    sound: SoundConfig,
    notifications: NotificationsConfig,
    inactivity: InactivityConfig,
    logging: LoggingConfig,
}

impl Default for Config {
    fn default() -> Self {
        let system_sounds = vec![
            "/System/Library/Sounds/Submarine.aiff".to_string(),
            "/System/Library/Sounds/Glass.aiff".to_string(),
            "/System/Library/Sounds/Ping.aiff".to_string(),
            "/System/Library/Sounds/Tink.aiff".to_string(),
            "/System/Library/Sounds/Purr.aiff".to_string(),
            "/System/Library/Sounds/Pop.aiff".to_string(),
            "/System/Library/Sounds/Funk.aiff".to_string(),
            "/System/Library/Sounds/Hero.aiff".to_string(),
            "/System/Library/Sounds/Blow.aiff".to_string(),
            "/System/Library/Sounds/Bottle.aiff".to_string(),
            "/System/Library/Sounds/Frog.aiff".to_string(),
            "/System/Library/Sounds/Basso.aiff".to_string(),
        ];

        Config {
            sound: SoundConfig {
                enabled: true,
                file: "/System/Library/Sounds/Submarine.aiff".to_string(),
                random: true,
                available_sounds: system_sounds,
                project_sounds: HashMap::new(),
                event_sounds: EventSounds {
                    permission: "/System/Library/Sounds/Ping.aiff".to_string(),
                    question: "/System/Library/Sounds/Ping.aiff".to_string(),
                    inactivity: "/System/Library/Sounds/Ping.aiff".to_string(),
                },
                min_interval: 2,
            },
            notifications: NotificationsConfig {
                audio: AudioNotification { enabled: true },
                terminal_notifier: TerminalNotifierConfig {
                    enabled: true,
                    title: "Claude Code".to_string(),
                    subtitle: "Question Detected".to_string(),
                },
                messages: NotificationMessages {
                    permission: "Claude requires your permission".to_string(),
                    question: "Claude has a question".to_string(),
                    inactivity: "Claude requires your direction".to_string(),
                },
                ntfy: NtfyConfig {
                    enabled: false,
                    topic: "".to_string(),
                    server: "https://ntfy.sh".to_string(),
                    priority: "default".to_string(),
                },
            },
            inactivity: InactivityConfig {
                enabled: true,
                timeout: 30,
                message: "Claude may be waiting for input".to_string(),
            },
            logging: LoggingConfig {
                log_questions: true,
                log_file: "~/.claude/questions-detected.log".to_string(),
                debug: true,
                debug_file: "~/.claude/smart-notify-debug.log".to_string(),
            },
        }
    }
}

fn get_config_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap();
    PathBuf::from(home).join(".claude/audio-notifier.yaml")
}


#[tauri::command]
async fn load_config() -> Result<Config, String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        // Return default config if file doesn't exist
        return Ok(Config::default());
    }

    let contents = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: Config = serde_yaml::from_str(&contents)
        .map_err(|e| format!("Failed to parse YAML: {}", e))?;

    Ok(config)
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
async fn import_config() -> Result<Config, String> {
    // For now, just reload from the default location
    // In a real implementation, you'd use a file dialog
    load_config().await
}

#[tauri::command]
async fn reset_to_defaults() -> Result<Config, String> {
    let default_config = Config::default();
    save_config(default_config.clone()).await?;
    Ok(default_config)
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
async fn open_log_file(log_type: String) -> Result<(), String> {
    let home = std::env::var("HOME").unwrap();
    let log_path = match log_type.as_str() {
        "questions" => format!("{}/.claude/questions-detected.log", home),
        "debug" => format!("{}/.claude/smart-notify-debug.log", home),
        _ => return Err("Invalid log type".to_string()),
    };

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
async fn select_sound_file() -> Result<Option<String>, String> {
    // This would use tauri-plugin-dialog in a real implementation
    // For now, returning None
    Ok(None)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            import_config,
            reset_to_defaults,
            preview_sound,
            open_log_file,
            select_sound_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
