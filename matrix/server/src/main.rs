mod create;
mod index;
mod update;
mod util;

use std::env::var;
use std::error::Error;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use sha2::{Digest, Sha256};
use uuid::Uuid;

use humphrey::http::{Request, Response, StatusCode};
use humphrey::App;
use humphrey_json::prelude::*;
use jasondb::Database;

pub struct State {
    db: Mutex<Database<Release>>,
    api_key: Mutex<Option<String>>,
    hashed_api_key: String,
    base_path: PathBuf,
}

pub struct Release {
    url: String,
    version: String,
    notes: String,
    platform: String,
    signature: String,
    pub_date: u64,
}

json_map! {
    Release,
    url => "url",
    version => "version",
    notes => "notes",
    platform => "platform",
    signature => "signature",
    pub_date => "pub_date"
}

fn main() -> Result<(), Box<dyn Error>> {
    let data_dir = var("EQUION_MATRIX_DATA_DIR")?;
    let data_dir = PathBuf::from(data_dir);

    if data_dir.is_file() {
        panic!("EQUION_MATRIX_DATA_DIR is not a directory");
    }

    let (api_key, hashed_api_key) = if !data_dir.exists() || !data_dir.join("key").exists() {
        // Create directories
        fs::create_dir_all(&data_dir)?;
        fs::create_dir(&data_dir.join("releases"))?;
        fs::create_dir(&data_dir.join("releases").join("windows"))?;
        fs::create_dir(&data_dir.join("releases").join("linux"))?;
        fs::create_dir(&data_dir.join("releases").join("macos"))?;

        // Generate API key
        let api_key = Uuid::new_v4().to_string();

        let hashed_api_key = {
            let mut hasher = Sha256::new();
            hasher.update(&api_key);
            hex::encode(hasher.finalize())
        };

        fs::write(data_dir.join("key"), &hashed_api_key)?;

        (Some(api_key), hashed_api_key)
    } else {
        (None, fs::read_to_string(data_dir.join("key"))?)
    };

    let db: Database<Release> = Database::new(&data_dir.join("db.jdb"))?;

    let state = State {
        db: Mutex::new(db),
        api_key: Mutex::new(api_key),
        hashed_api_key,
        base_path: data_dir,
    };

    let app = App::new_with_config(32, state)
        .with_route("/key", key_handler)
        .with_route("/update/*", update::handler)
        .with_route("/create", create::handler)
        .with_route("/*", index::handler);

    app.run("0.0.0.0:80")
}

fn key_handler(_: Request, state: Arc<State>) -> Response {
    let mut key = state.api_key.lock().unwrap();

    if let Some(api_key) = key.take() {
        Response::new(StatusCode::OK, api_key)
    } else {
        Response::new(StatusCode::Gone, "Key has already been shown")
    }
}
