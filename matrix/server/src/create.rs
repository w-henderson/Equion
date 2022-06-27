use crate::util::error_context;
use crate::{Release, State};

use humphrey::http::{Request, Response, StatusCode};
use humphrey_json::prelude::*;

use sha2::{Digest, Sha256};

use std::fs;
use std::sync::Arc;
use std::time::UNIX_EPOCH;

struct CreateJson {
    version: String,
    platform: String,
    file: FileJson,
    signature: FileJson,
    release_notes: String,
    api_key: String,
}

struct FileJson {
    name: String,
    data: String,
}

json_map! {
    CreateJson,
    version => "version",
    platform => "platform",
    file => "file",
    signature => "signature",
    release_notes => "releaseNotes",
    api_key => "apiKey"
}

json_map! {
    FileJson,
    name => "name",
    data => "data"
}

pub fn handler(request: Request, state: Arc<State>) -> Response {
    error_context(move || {
        let json: CreateJson = request
            .content
            .as_ref()
            .and_then(|content| std::str::from_utf8(content).ok())
            .and_then(|content| humphrey_json::from_str(content).ok())
            .ok_or_else(|| (StatusCode::BadRequest, "Invalid JSON".into()))?;

        // Check permissions
        let hashed_api_key = {
            let mut hasher = Sha256::new();
            hasher.update(json.api_key);
            hex::encode(hasher.finalize())
        };

        if hashed_api_key != state.hashed_api_key {
            return Err((StatusCode::Unauthorized, "Invalid API key".into()));
        }

        if &json.platform != "windows" && &json.platform != "linux" && &json.platform != "macos" {
            return Err((StatusCode::BadRequest, "Invalid platform".into()));
        }

        // Extract and parse the contents of the file and signature.
        let file_contents = base64::decode(json.file.data)
            .map_err(|_| (StatusCode::BadRequest, "Invalid base64".into()))?;
        let signature = String::from_utf8(
            base64::decode(json.signature.data)
                .map_err(|_| (StatusCode::BadRequest, "Invalid base64".into()))?,
        )
        .map_err(|_| (StatusCode::BadRequest, "Invalid signature".into()))?;

        // Write to disk
        fs::write(
            state
                .base_path
                .join("releases")
                .join(&json.platform)
                .join(&json.file.name),
            file_contents,
        )
        .map_err(|_| (StatusCode::InternalError, "Failed to write file".into()))?;

        // Write to the database
        let database_entry = Release {
            url: format!("{}/{}", state.url, json.file.name),
            version: json.version,
            notes: json.release_notes,
            platform: json.platform.clone(),
            signature,
            pub_date: UNIX_EPOCH.elapsed().unwrap().as_secs(),
        };

        let mut db = state.db.lock().unwrap();

        db.set(json.platform, database_entry)
            .map_err(|_| (StatusCode::InternalError, "Database error".into()))?;

        Ok(Response::new(StatusCode::Created, "Created release"))
    })
}
