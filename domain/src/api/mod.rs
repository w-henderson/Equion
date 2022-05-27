//! Provides the HTTP and WebSocket API endpoints and handles serialization and deserialization of JSON.

pub mod auth;
pub mod files;
pub mod http;
pub mod messages;
pub mod sets;
pub mod user;
pub mod ws;

use crate::State;

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

/// Represents a function able to handle a request. The function is passed the state and the JSON body, and returns a JSON value.
pub trait Handler: Fn(Arc<State>, Value) -> Value + Send + Sync + 'static {}
impl<T> Handler for T where T: Fn(Arc<State>, Value) -> Value + Send + Sync + 'static {}

/// Matches the command to the appropriate handler.
///
/// - For HTTP requests, the command is specified by the API route, for example `/api/v1/user`.
/// - For WebSocket requests, the command is specified in the message, for example `{ "command": "v1/user" }`.
pub fn matcher(command: &str) -> Option<Box<dyn Handler>> {
    match command {
        "v1/signup" => Some(Box::new(auth::signup)),
        "v1/login" => Some(Box::new(auth::login)),
        "v1/logout" => Some(Box::new(auth::logout)),
        "v1/user" => Some(Box::new(user::get_user)),
        "v1/updateUser" => Some(Box::new(user::update_user)),
        "v1/sets" => Some(Box::new(sets::get_sets)),
        "v1/set" => Some(Box::new(sets::get_set)),
        "v1/createSet" => Some(Box::new(sets::create_set)),
        "v1/createSubset" => Some(Box::new(sets::create_subset)),
        "v1/joinSet" => Some(Box::new(sets::join_set)),
        "v1/leaveSet" => Some(Box::new(sets::leave_set)),
        "v1/messages" => Some(Box::new(messages::get_messages)),
        "v1/sendMessage" => Some(Box::new(messages::send_message)),
        _ => None,
    }
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

/// Returns the "command not found" JSON response.
pub fn not_found() -> Value {
    json!({
        "success": false,
        "error": "Invalid API command"
    })
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
