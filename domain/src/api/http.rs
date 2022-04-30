use crate::api::{matcher, not_found};
use crate::State;

use humphrey::http::headers::ResponseHeader;
use humphrey::http::{Request, Response, StatusCode};

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

pub fn handler(request: Request, state: Arc<State>) -> Response {
    let route = request.uri.strip_prefix("/api/").unwrap();

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

    Response::empty(status_code)
        .with_bytes(response_body.serialize())
        .with_header(ResponseHeader::ContentType, "application/json".to_string())
        .with_header(ResponseHeader::AccessControlAllowOrigin, "*".to_string())
}
