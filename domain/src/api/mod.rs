pub mod auth;
pub mod messages;
pub mod sets;
pub mod user;

use crate::State;

use humphrey::http::headers::HeaderType;
use humphrey::http::{Request, Response, StatusCode};

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

pub fn matcher(command: &str) -> Box<dyn Fn(Arc<State>, String) -> Value + Send + Sync + 'static> {
    match command {
        "v1/signup" => Box::new(auth::signup),
        "v1/login" => Box::new(auth::login),
        "v1/logout" => Box::new(auth::logout),
        "v1/user" => Box::new(user::get_user),
        "v1/updateUser" => Box::new(user::update_user),
        "v1/sets" => Box::new(sets::get_sets),
        "v1/set" => Box::new(sets::get_set),
        "v1/createSet" => Box::new(sets::create_set),
        "v1/createSubset" => Box::new(sets::create_subset),
        "v1/joinSet" => Box::new(sets::join_set),
        "v1/leaveSet" => Box::new(sets::leave_set),
        "v1/messages" => Box::new(messages::get_messages),
        "v1/sendMessage" => Box::new(messages::send_message),
        _ => Box::new(|_, _| not_found()),
    }
}

pub fn http_api(request: Request, state: Arc<State>) -> Response {
    let route = request.uri.strip_prefix("/api/").unwrap();

    let string = request.content.and_then(|v| String::from_utf8(v).ok());

    let response_body = if let Some(string) = string {
        (matcher(route))(state, string)
    } else {
        json!({
            "success": false,
            "error": "No body"
        })
    };

    let success = response_body
        .get("success")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let status_code = if success {
        StatusCode::OK
    } else {
        StatusCode::BadRequest
    };

    Response::empty(status_code)
        .with_bytes(response_body.serialize())
        .with_header(HeaderType::ContentType, "application/json")
}

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

pub fn not_found() -> Value {
    json!({
        "success": false,
        "error": "Invalid API command"
    })
}

pub fn get_string(json: &Value, key: &str) -> Result<String, String> {
    json.get(key)
        .ok_or_else(|| format!("Missing {}", key))
        .and_then(|v| v.as_str().ok_or_else(|| format!("Invalid {}", key)))
        .map(|s| s.to_string())
}

pub fn get_int(json: &Value, key: &str) -> Result<u64, String> {
    json.get(key)
        .ok_or_else(|| format!("Missing {}", key))
        .and_then(|v| v.as_number().ok_or_else(|| format!("Invalid {}", key)))
        .map(|n| n as u64)
}
