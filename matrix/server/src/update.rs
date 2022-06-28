use crate::util::error_context;
use crate::State;

use humphrey::http::{Request, Response, StatusCode};
use humphrey_json::prelude::*;

use chrono::{DateTime, NaiveDateTime, Utc};

use std::sync::Arc;

pub fn handler(request: Request, state: Arc<State>) -> Response {
    error_context(move || {
        let path = request.uri.strip_prefix("/update/").unwrap();

        // Parse the path
        let mut components = path.split('/');
        let mut target = components
            .next()
            .ok_or_else(|| (StatusCode::BadRequest, "Missing target".into()))?;
        let current_version = components
            .next()
            .ok_or_else(|| (StatusCode::BadRequest, "Missing current version".into()))?;
        if target == "darwin" {
            target = "macos";
        }

        // Get the latest release
        let mut db = state.db.lock().unwrap();
        let release = db
            .get(target)
            .map_err(|_| (StatusCode::InternalError, "Database error".into()))?;

        if release.version == current_version {
            return Ok(Response::new(StatusCode::NoContent, "Up to date"));
        }

        let pub_date: DateTime<Utc> = DateTime::from_utc(
            NaiveDateTime::from_timestamp(release.pub_date as i64, 0),
            Utc,
        );

        let host = request
            .headers
            .get("Host")
            .ok_or_else(|| (StatusCode::BadRequest, "Missing Host header".into()))?;

        let release_url = format!(
            "https://{}/release/download/{}/{}",
            host, release.platform, release.updater_filename
        );

        let payload = json!({
            "url": release_url,
            "version": (release.version),
            "notes": (release.notes),
            "pub_date": (pub_date.to_rfc3339()),
            "signature": (release.signature)
        });

        Ok(Response::new(StatusCode::OK, payload.serialize())
            .with_header("Content-Type", "application/json"))
    })
}
