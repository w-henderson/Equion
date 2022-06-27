use crate::State;

use humphrey::http::{Request, Response, StatusCode};
use jasondb::error::JasonError;

use std::sync::Arc;

pub fn handler(request: Request, state: Arc<State>) -> Response {
    let mut platform = request.uri.strip_prefix('/').unwrap();
    if platform == "darwin" {
        platform = "macos";
    }

    let mut db = state.db.lock().unwrap();
    let release = db.get(platform);

    match release {
        Ok(release) => Response::redirect(format!(
            "/release/download/{}/{}",
            release.platform, release.url
        )),
        Err(JasonError::InvalidKey) => Response::new(StatusCode::NotFound, "Invalid platform"),
        Err(err) => Response::new(StatusCode::InternalError, err.to_string()),
    }
}
