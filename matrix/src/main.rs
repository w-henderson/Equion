//! Simple caching release manager.

#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]

mod platform;
mod schema;
use platform::*;
use schema::*;

use humphrey::http::headers::HeaderType;
use humphrey::http::{Request, Response, StatusCode};
use humphrey::{App, Client};

use std::collections::HashMap;
use std::env::var;
use std::sync::{Arc, Mutex};

/// The app's internal state.
struct State {
    /// The Humphrey HTTP client.
    client: Mutex<Client>,
    /// The latest cached release.
    cached_release: Mutex<Option<Release>>,
    /// The GitHub username.
    user: String,
    /// The GitHub repository name.
    repo: String,
    /// The GitHub API token.
    token: String,
}

/// A cached release.
struct Release {
    /// The tag of the release, e.g. `v1.0.0`.
    tag: String,
    /// The assets for different platforms.
    platforms: HashMap<Platform, Asset>,
}

/// A cached asset as part of a release.
struct Asset {
    /// The filename of the asset.
    filename: String,
    /// The downloadable content of the asset.
    download: Vec<u8>,
}

fn main() {
    let user = var("EQUION_USER").expect("EQUION_USER must be set");
    let repo = var("EQUION_REPO").expect("EQUION_REPO must be set");
    let token = var("EQUION_TOKEN").expect("EQUION_TOKEN must be set");

    let state = State {
        client: Mutex::new(Client::new()),
        cached_release: Mutex::new(None),
        user,
        repo,
        token,
    };

    let app: App<State> = App::new_with_config(32, state).with_route("/*", download);

    app.run("0.0.0.0:80").unwrap();
}

/// Handles requests to the download routes.
fn download(request: Request, state: Arc<State>) -> Response {
    error_context(move || {
        let platform = match request.uri.strip_prefix('/').unwrap() {
            "windows" => Platform::Windows,
            "linux" => Platform::Linux,
            "macos" => Platform::MacOS,
            _ => return Err("Invalid platform".into()),
        };

        let api_response: Vec<GitHubRelease> = {
            let mut client = state.client.lock().unwrap();

            let auth = format!(
                "Basic {}",
                base64::encode(format!("{}:{}", state.user, state.token))
            );

            let response = client
                .get(format!(
                    "https://api.github.com/repos/{}/{}/releases",
                    state.user, state.repo
                ))
                .map_err(|_| "Failed to access GitHub API".to_string())?
                .with_header(HeaderType::Authorization, auth)
                .with_header(HeaderType::Accept, "application/vnd.github.v3+json")
                .with_header(HeaderType::UserAgent, "equion/matrix")
                .send()
                .map_err(|_| "Failed to access GitHub API".to_string())?;

            let response = String::from_utf8(response.body)
                .map_err(|_| "Failed to read GitHub API response")?;

            humphrey_json::from_str(&response)
                .map_err(|e| format!("Failed to parse JSON: {}", e))?
        };

        let mut cached_release = state.cached_release.lock().unwrap();
        let fetched_release = api_response.iter().max_by_key(|r| r.published_at.clone());

        if let Some(fetched_release) = fetched_release {
            if let Some(cached_release) = cached_release.as_mut() {
                if cached_release.tag != fetched_release.tag_name {
                    *cached_release = retrieve_release(fetched_release, state.clone())?;
                }
            } else {
                *cached_release = Some(retrieve_release(fetched_release, state.clone())?);
            }

            serve_release(cached_release.as_ref().unwrap(), &platform)
        } else {
            *cached_release = None;

            Err("No releases found".into())
        }
    })
}

/// Serves a cached release to the user.
fn serve_release(release: &Release, platform: &Platform) -> Result<Response, String> {
    let asset = release
        .platforms
        .get(platform)
        .ok_or_else(|| format!("No release for {}", platform))?;

    Ok(Response::empty(StatusCode::OK)
        .with_bytes(asset.download.clone())
        .with_header(HeaderType::ContentType, "application/octet-stream")
        .with_header(
            HeaderType::ContentDisposition,
            format!("attachment; filename={}", asset.filename),
        ))
}

/// Retrieves and caches a release from the GitHub API.
fn retrieve_release(fetched_release: &GitHubRelease, state: Arc<State>) -> Result<Release, String> {
    let mut platforms = HashMap::new();

    'platform: for platform in [Platform::Windows, Platform::Linux, Platform::MacOS] {
        for asset in &fetched_release.assets {
            if platform.does_filename_match(&asset.name) {
                let mut client = state.client.lock().unwrap();

                let auth = format!(
                    "Basic {}",
                    base64::encode(format!("{}:{}", state.user, state.token))
                );

                let response = client
                    .get(&asset.url)
                    .map_err(|_| "Failed to access GitHub API".to_string())?
                    .with_redirects(true)
                    .with_header(HeaderType::Authorization, auth)
                    .with_header(HeaderType::Accept, "application/octet-stream")
                    .with_header(HeaderType::UserAgent, "equion/matrix")
                    .send()
                    .map_err(|_| "Failed to access GitHub API".to_string())?;

                platforms.insert(
                    platform,
                    Asset {
                        filename: asset.name.clone(),
                        download: response.body,
                    },
                );

                continue 'platform;
            }
        }
    }

    Ok(Release {
        tag: fetched_release.tag_name.clone(),
        platforms,
    })
}

/// Converts errors into responses.
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
