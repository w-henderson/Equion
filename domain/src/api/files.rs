//! Provides the high-level user-facing file management API.

use crate::State;

use humphrey::http::headers::HeaderType;
use humphrey::http::mime::MimeType;
use humphrey::http::{Request, Response, StatusCode};

use std::sync::Arc;

/// The handler for the `/api/v1/files/*` and `/api/v1/updateUserImage` endpoints.
pub fn handler(request: Request, state: Arc<State>) -> Response {
    let response = if request.uri.starts_with("/api/v1/files/") {
        get_file(request, state)
    } else if request.uri == "/api/v1/updateUserImage" {
        update_user_image(request, state)
    } else {
        Err("No such endpoint".to_string())
    };

    match response {
        Ok(response) => response,
        Err(error) => Response::empty(StatusCode::BadRequest)
            .with_bytes(error)
            .with_header(HeaderType::ContentType, "application/json")
            .with_header(HeaderType::AccessControlAllowOrigin, "*"),
    }
}

/// The handler for the `/api/v1/files/*` endpoint.
/// Attempts to get the file from the file store and sends it back with appropriate metadata.
fn get_file(request: Request, state: Arc<State>) -> Result<Response, String> {
    let id = request.uri.strip_prefix("/api/v1/files/").unwrap();

    state.get_file(id).map(|file| {
        Response::empty(StatusCode::OK)
            .with_bytes(file.content)
            .with_header(HeaderType::AccessControlAllowOrigin, "*")
            .with_header(
                HeaderType::ContentType,
                MimeType::from_extension(file.name.split('.').last().unwrap_or("")).to_string(),
            )
    })
}

/// Parses the request and, if successful, updates the user's image.
fn update_user_image(request: Request, state: Arc<State>) -> Result<Response, String> {
    let file_name = request
        .headers
        .get("X-File-Name")
        .ok_or("No file name provided")?
        .to_string();
    let token = request
        .headers
        .get("X-Equion-Token")
        .ok_or("No token provided")?
        .to_string();
    let content = request.content.ok_or("No file content provided")?;

    state.update_user_image(token, file_name, content).map(|_| {
        Response::empty(StatusCode::OK)
            .with_bytes("OK")
            .with_header(HeaderType::AccessControlAllowOrigin, "*")
    })
}
