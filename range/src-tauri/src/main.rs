#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;
use window_shadows::set_shadow;

fn main() {
    let app = tauri::Builder::default()
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    let window = app.get_window("main").expect("error while getting window");
    set_shadow(&window, true).expect("unsupported platform");

    app.run(|_, _| ());
}
