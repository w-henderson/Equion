//! Provides the HTTP and WebSocket API endpoints and handles serialization and deserialization of JSON.

pub mod files;
pub mod http;
pub mod ws;

#[macro_use]
pub mod r#macro;

use crate::State;

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

declare_endpoints! {
    // Authentication endpoints
    "v1/signup" => signup("username", "password", "displayName", "email") -> {
        "uid": uid,
        "token": token
    },
    "v1/login" => login("username", "password") -> {
        "uid": uid,
        "token": token
    },
    "v1/logout" => logout("token") -> None,
    "v1/validateToken" => validate_token("token") -> "uid",

    // User endpoints
    "v1/user" => get_user("uid") -> "user",
    "v1/updateUser" => update_user("token", (optional "displayName"), (optional "email"), (optional "bio")) -> None,

    // Sets endpoints
    "v1/sets" => get_sets("token") -> "sets",
    "v1/set" => get_set("token", "id") -> "set",
    "v1/createSet" => create_set("token", "name", (optional "icon")) -> "id",
    "v1/createSubset" => create_subset("token", "set", "name") -> "id",
    "v1/joinSet" => join_set("token", "set") -> None,
    "v1/leaveSet" => leave_set("token", "set") -> None,

    // Messages endpoints
    "v1/messages" => messages("token", "subset", (optional "before"), (numeric optional "limit")) -> "messages",
    "v1/sendMessage" => send_message("token", "subset", "message", (optional "attachment.name"), (optional "attachment.data")) -> None,
    "v1/typing" => set_typing("token", "subset") -> None
}

/// Represents a function able to handle requests.
pub type Handler = fn(Arc<State>, Value) -> Value;

/// Matches the command to the appropriate handler.
///
/// - For HTTP requests, the command is specified by the API route, for example `/api/v1/user`.
/// - For WebSocket requests, the command is specified in the message, for example `{ "command": "v1/user" }`.
pub fn matcher(command: &str) -> Option<Handler> {
    get_endpoint!(command)
}

/// Runs the given closure in an error-catching context.
///
/// This converts error strings into JSON values for the API.
pub fn error_context<F>(f: F) -> Value
where
    F: Fn() -> Result<Value, String>,
{
    match f() {
        Ok(v) => v,
        Err(e) => json!({
            "success": false,
            "error": e
        }),
    }
}

/// Attempts to get a string at the given key from the JSON value.
pub fn get_string(json: &Value, key: &str) -> Result<String, String> {
    deep_index(json, key)
        .ok_or_else(|| format!("Missing {}", key))
        .and_then(|v| v.as_str().ok_or_else(|| format!("Invalid {}", key)))
        .map(|s| s.to_string())
}

/// Attempts to get an integer at the given key from the JSON value.
pub fn get_int(json: &Value, key: &str) -> Result<u64, String> {
    deep_index(json, key)
        .ok_or_else(|| format!("Missing {}", key))
        .and_then(|v| v.as_number().ok_or_else(|| format!("Invalid {}", key)))
        .map(|n| n as u64)
}

/// Attempts to get a boolean value at the given key from the JSON value.
#[allow(dead_code)]
pub fn get_bool(json: &Value, key: &str) -> Result<bool, String> {
    deep_index(json, key)
        .ok_or_else(|| format!("Missing {}", key))
        .and_then(|v| v.as_bool().ok_or_else(|| format!("Invalid {}", key)))
}

/// From [https://github.com/w-henderson/JasonDB/blob/master/jasondb/src/util/indexing.rs]
fn deep_index<'a>(json: &'a Value, index: &str) -> Option<&'a Value> {
    let indexing_path = index.split('.');
    let mut current_json = json;
    for index in indexing_path {
        match current_json.get(index) {
            Some(value) => current_json = value,
            None => return None,
        }
    }

    Some(current_json)
}
