#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;
use window_shadows::set_shadow;

use std::fs::File;
use std::io::Read;

#[tauri::command]
fn get_base64_file(path: String) -> Result<String, String> {
    let mut file = File::open(path).map_err(|_| "Could not open file".to_string())?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)
        .map_err(|_| "Could not read file".to_string())?;

    let data = base64::encode(&buf);

    Ok(data)
}

fn main() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_base64_file])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    let window = app.get_window("main").expect("error while getting window");
    set_shadow(&window, true).ok();

    app.run(|_, _| ());
}
