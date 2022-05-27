//! Provides handlers for HTTP endpoints.

use crate::api::{files, matcher, not_found};
use crate::State;

use humphrey::http::headers::HeaderType;
use humphrey::http::{Request, Response, StatusCode};

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

/// The core HTTP request handler for the API.
///
/// Extracts the JSON body of each request before passing it to the request [`matcher`].
pub fn handler(request: Request, state: Arc<State>) -> Response {
    let route = request.uri.strip_prefix("/api/").unwrap();

    if route.starts_with("v1/files/") || route == "v1/updateUserImage" {
        return files::handler(request, state);
    }

    let json = request
        .content
        .and_then(|v| String::from_utf8(v).ok())
        .and_then(|s| humphrey_json::from_str(&s).ok());

    let response_body: Value = if let Some(json) = json {
        let handler = matcher(route).unwrap_or_else(|| Box::new(|_, _| not_found()));
        handler(state, json)
    } else {
        json!({
            "success": false,
            "error": "Invalid JSON"
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

    let serialized = response_body.serialize();

    if !success {
        crate::log!(
            "{} Error: {}",
            request.address,
            response_body.get("error").and_then(|v| v.as_str()).unwrap()
        );
    }

    let status_code_number: u16 = status_code.into();
    let status_code_string: &str = status_code.into();

    crate::log!(
        Debug,
        "{} {} {} {} {}",
        status_code_number,
        status_code_string,
        request.address,
        request.method,
        request.uri
    );

    Response::empty(status_code)
        .with_bytes(serialized)
        .with_header(HeaderType::ContentType, "application/json")
        .with_header(HeaderType::AccessControlAllowOrigin, "*")
}
