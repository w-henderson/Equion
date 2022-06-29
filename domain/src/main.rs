//! The main API server for Equion.
//!
//! The API schema is defined in the [`api.md`](https://github.com/w-henderson/Equion/blob/master/docs/api.md) file of the root directory.

#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]

mod api;
mod db;
mod server;
mod status;
mod util;
mod voice;

#[macro_use]
mod log;

#[cfg(test)]
mod tests;

use crate::api::{http, ws};
use crate::db::Database;

use humphrey::http::cors::Cors;
use humphrey::App;

use humphrey_ws::async_app::AsyncSender;
use humphrey_ws::ping::Heartbeat;
use humphrey_ws::{async_websocket_handler, AsyncWebsocketApp};

use voice::VoiceServer;

use std::collections::HashMap;
use std::error::Error;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex, RwLock};
use std::thread::spawn;
use std::time::Duration;

/// The address to connect to the database at, if not already specified in the `EQUION_DATABASE_URL` environment variable.
static DB_URL: &str = "mysql://root:hunter2@localhost:3306/equion";

/// The state of the server.
#[derive(Clone)]
pub struct State {
    /// A pool of connections to the database.
    db: Arc<Database>,
    /// The sender to send messages to clients using WebSocket.
    global_sender: Arc<Mutex<Option<AsyncSender>>>,
    /// A hashmap of set IDs to WebSocket connections that are subscribed to them.
    subscriptions: Arc<RwLock<HashMap<String, Vec<SocketAddr>>>>,
    /// The voice server.
    voice: Arc<VoiceServer>,
}

/// The main function.
fn main() -> Result<(), Box<dyn Error>> {
    let db_url = std::env::var("EQUION_DATABASE_URL").unwrap_or_else(|_| String::from(DB_URL));

    // Connect to the database.
    #[cfg(not(test))]
    let db = Database::new(mysql::Pool::new(mysql::Opts::from_url(&db_url)?)?);
    #[cfg(test)]
    let db = Database::new();

    log!("Connected to MySQL database at {}", db_url);

    // Initialise the app's state.
    // At the moment, everything is in `Arc`s due to limitations with Humphrey's API, but this should be fixed in the future.
    let state = State {
        db: Arc::new(db),
        global_sender: Arc::new(Mutex::new(None)),
        subscriptions: Arc::new(RwLock::new(HashMap::new())),
        voice: Arc::new(VoiceServer::new()),
    };

    // Initialise the WebSocket app for real-time updates.
    let ws_app: AsyncWebsocketApp<State> =
        AsyncWebsocketApp::new_unlinked_with_config(state.clone(), 16)
            .with_heartbeat(Heartbeat::new(
                Duration::from_secs(5),
                Duration::from_secs(10),
            ))
            .with_message_handler(ws::handler)
            .with_disconnect_handler(ws::unsubscribe_all);

    // Give the state access to the WebSocket sender.
    state.global_sender.lock().unwrap().replace(ws_app.sender());
    let hook = ws_app.connect_hook().unwrap();

    // Initialise the HTTP app for the standard API.
    let app: App<State> = App::new_with_config(32, state)
        .with_cors(Cors::wildcard())
        .with_route("/", status::status)
        .with_route("/api/*", http::handler)
        .with_websocket_route("/ws", async_websocket_handler(hook));

    spawn(move || {
        log!("Started WebSocket service");
        ws_app.run();
    });

    log!("Started HTTP server on port 80");

    app.run("0.0.0.0:80")
}
