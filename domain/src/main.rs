mod api;
mod auth;
mod messages;
mod sets;
mod subscriptions;
mod user;
mod util;

use crate::api::{http, ws};

use humphrey::App;

use humphrey_ws::async_app::AsyncSender;
use humphrey_ws::{async_websocket_handler, AsyncWebsocketApp};

use mysql::{Opts, Pool};

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
}

fn main() -> Result<(), Box<dyn Error>> {
    // Connect to the database.
    let pool = Pool::new(Opts::from_url(DB_URL)?)?;

    // Initialise the app's state.
    // At the moment, everything is in `Arc`s due to limitations with Humphrey's API, but this should be fixed in the future.
    let state = State {
        pool: Arc::new(pool),
        global_sender: Arc::new(Mutex::new(None)),
        subscriptions: Arc::new(RwLock::new(HashMap::new())),
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
        .with_route("/api/*", http::handler)
        .with_websocket_route("/ws", async_websocket_handler(hook));

    spawn(move || ws_app.run());

    app.run("0.0.0.0:80")
}
