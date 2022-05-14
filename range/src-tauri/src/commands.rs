use tauri::{AppHandle, TrayIcon};

use std::fs::File;
use std::io::Read;

#[cfg(target_os = "windows")]
const PLAIN_ICON: &[u8] = include_bytes!("../icons/tray_icon_normal.ico");
#[cfg(target_os = "macos")]
const PLAIN_ICON: &[u8] = include_bytes!("../icons/tray_icon_normal.png");
#[cfg(target_os = "windows")]
const NOTIFICATION_ICON: &[u8] = include_bytes!("../icons/tray_icon_notification.ico");
#[cfg(target_os = "macos")]
const NOTIFICATION_ICON: &[u8] = include_bytes!("../icons/tray_icon_notification.png");

#[tauri::command]
pub fn get_base64_file(path: String) -> Result<String, String> {
    let mut file = File::open(path).map_err(|_| "Could not open file".to_string())?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)
        .map_err(|_| "Could not read file".to_string())?;

    let data = base64::encode(&buf);

    Ok(data)
}

#[tauri::command]
#[cfg(any(target_os = "windows", target_os = "macos"))]
pub fn set_notification_icon(app_handle: AppHandle, icon: String) {
    println!("setting notification icon to {}", icon);
    let icon = if icon == "notification" {
        TrayIcon::Raw(NOTIFICATION_ICON.to_vec())
    } else {
        TrayIcon::Raw(PLAIN_ICON.to_vec())
    };

    app_handle.tray_handle().set_icon(icon).ok();
}

#[tauri::command]
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn set_notification_icon(app_handle: AppHandle, icon: String) {
    // Not implemented
}
