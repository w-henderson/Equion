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

pub fn http_api<F>(f: F) -> impl Fn(Request, Arc<State>) -> Response + Send + Sync + 'static
where
    F: Fn(Arc<State>, String) -> Value + Send + Sync + 'static,
{
    move |request: Request, state: Arc<State>| {
        let string = request.content.and_then(|v| String::from_utf8(v).ok());

        let response_body = if let Some(string) = string {
            f(state, string)
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
