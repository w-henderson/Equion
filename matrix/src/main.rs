use humphrey::http::headers::HeaderType;
use humphrey::http::{Request, Response, StatusCode};
use humphrey::{App, Client};

use humphrey_json::Value;

use std::collections::HashMap;
use std::env::var;
use std::sync::{Arc, Mutex};

struct State {
    client: Mutex<Client>,
    latest_releases: Mutex<HashMap<Platform, Release>>,
    user: String,
    repo: String,
    token: String,
}

enum Platform {
    Windows,
    Linux,
    MacOS,
}

struct Release {
    tag: String,
    timestamp: String,
    download: Vec<u8>,
    filename: String,
}

fn main() {
    let user = var("EQUION_USER").expect("EQUION_USER must be set");
    let repo = var("EQUION_REPO").expect("EQUION_REPO must be set");
    let token = var("EQUION_TOKEN").expect("EQUION_TOKEN must be set");

    let state = State {
        client: Mutex::new(Client::new()),
        latest_releases: Mutex::new(HashMap::with_capacity(3)),
        user,
        repo,
        token,
    };

    let app: App<State> = App::new_with_config(32, state).with_route("/*", download);
}

fn download(request: Request, state: Arc<State>) -> Response {
    error_context(move || {
        let platform = match request.uri.strip_prefix('/').unwrap() {
            "windows" => Platform::Windows,
            "linux" => Platform::Linux,
            "macos" => Platform::MacOS,
            _ => return Err("Invalid platform".into()),
        };

        let api_response: Value = {
            let mut client = state.client.lock().unwrap();

            let auth = format!(
                "Basic {}",
                base64::encode(format!("{}:{}", state.user, state.repo))
            );

            let response = String::from_utf8(
                client
                    .get(format!(
                        "https://api.github.com/repos/{}/{}/releases",
                        state.user, state.repo
                    ))
                    .map_err(|_| "Failed to access GitHub API".to_string())?
                    .with_header(HeaderType::Authorization, auth)
                    .send()
                    .map_err(|_| "Failed to access GitHub API".to_string())?
                    .body,
            )
            .map_err(|_| "Failed to read GitHub API response")?;

            humphrey_json::from_str(&response).map_err(|_| "Failed to parse JSON")?
        };

        Err("Not implemented".into())
    })
}

fn error_context<F>(f: F) -> Response
where
    F: Fn() -> Result<Response, String>,
{
    match f() {
        Ok(response) => response,
        Err(error) => Response::empty(StatusCode::InternalError)
            .with_bytes(error)
            .with_header("Content-Type", "text/plain"),
    }
}
