#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

use tauri::{AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};

fn main() {
    tauri_plugin_deep_link::prepare("dev.whenderson.equion");

    let tray_menu =
        SystemTrayMenu::new().add_item(CustomMenuItem::new("quit".to_string(), "Quit Equion"));
    let tray = SystemTray::new().with_menu(tray_menu);

    let app = tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            tauri_plugin_deep_link::register("equion", move |req| {
                if let Some(w) = handle.get_window("main") {
                    if w.is_visible().unwrap() {
                        w.set_focus().ok();
                    } else {
                        w.show().ok();
                        w.maximize().ok();
                        w.set_focus().ok();
                        w.emit("show", "").ok();
                    }
                }

                handle.emit_all("deep-link", req).unwrap()
            })
            .unwrap();
            Ok(())
        })
        .system_tray(tray)
        .invoke_handler(tauri::generate_handler![
            commands::get_base64_file,
            commands::set_notification_icon
        ])
        .on_system_tray_event(tray_handler)
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|_, _| ());
}

fn tray_handler(app: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            if let Some(w) = app.get_window("main") {
                w.show().ok();
                w.maximize().ok();
                w.set_focus().ok();
                w.emit("show", "").ok();
            }
        }
        SystemTrayEvent::MenuItemClick { id, .. } => {
            if id == "quit" {
                std::process::exit(0);
            }
        }
        _ => {}
    }
}
