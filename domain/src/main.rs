mod api;
mod server;
mod util;
mod voice;

#[macro_use]
mod log;

use crate::api::{http, ws};

use humphrey::http::cors::Cors;
use humphrey::App;

use humphrey_ws::async_app::AsyncSender;
use humphrey_ws::{async_websocket_handler, AsyncWebsocketApp};

use mysql::{Opts, Pool};
use voice::VoiceServer;

use std::collections::HashMap;
use std::error::Error;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex, RwLock};
use std::thread::spawn;

static DB_URL: &str = "mysql://root:hunter2@localhost:3306/equion";

#[derive(Clone)]
pub struct State {
    pool: Arc<Pool>,
    global_sender: Arc<Mutex<Option<AsyncSender>>>,
    subscriptions: Arc<RwLock<HashMap<String, Vec<SocketAddr>>>>,
    voice: Arc<VoiceServer>,
}

fn main() -> Result<(), Box<dyn Error>> {
    let db_url = std::env::var("EQUION_DATABASE_URL").unwrap_or_else(|_| String::from(DB_URL));

    // Connect to the database.
    let pool = Pool::new(Opts::from_url(&db_url)?)?;

    log!("Connected to MySQL database at {}", db_url);

    // Initialise the app's state.
    // At the moment, everything is in `Arc`s due to limitations with Humphrey's API, but this should be fixed in the future.
    let state = State {
        pool: Arc::new(pool),
        global_sender: Arc::new(Mutex::new(None)),
        subscriptions: Arc::new(RwLock::new(HashMap::new())),
        voice: Arc::new(VoiceServer::new()),
    };

    // Initialise the WebSocket app for real-time updates.
    let ws_app: AsyncWebsocketApp<State> =
        AsyncWebsocketApp::new_unlinked_with_config(state.clone(), 16)
            .with_message_handler(ws::handler)
            .with_disconnect_handler(ws::unsubscribe_all);

    // Give the state access to the WebSocket sender.
    state.global_sender.lock().unwrap().replace(ws_app.sender());
    let hook = ws_app.connect_hook().unwrap();

    // Initialise the HTTP app for the standard API.
    let app: App<State> = App::new_with_config(32, state)
        .with_cors(Cors::wildcard())
        .with_route("/api/*", http::handler)
        .with_websocket_route("/ws", async_websocket_handler(hook));

    spawn(move || {
        log!("Started WebSocket service");
        ws_app.run();
    });

    log!("Started HTTP server on port 80");

    app.run("0.0.0.0:80")
}
