use crate::api::{error_context, get_string, matcher, not_found};
use crate::State;

use humphrey_ws::{AsyncStream, Message};

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::net::SocketAddr;
use std::sync::Arc;

pub fn handler(stream: AsyncStream, message: Message, state: Arc<State>) {
    let json: Option<(Value, String)> = message
        .text()
        .and_then(|s| humphrey_json::from_str(s).ok())
        .and_then(|v: Value| {
            let command = get_string(&v, "command").ok()?;
            Some((v, command))
        });

    let addr = stream.peer_addr();

    let response_body: Value = if let Some((json, command)) = json {
        let handler = matcher(&command);

        match handler {
            Some(handler) => handler(state, json),
            None => match command.as_str() {
                "v1/subscribe" => subscribe(state, json, addr),
                "v1/unsubscribe" => unsubscribe(state, json, addr),
                _ => not_found(),
            },
        }
    } else {
        json!({
            "success": false,
            "error": "Invalid JSON"
        })
    };

    let message = Message::new(response_body.serialize());

    stream.send(message);
}

pub fn unsubscribe_all(stream: AsyncStream, state: Arc<State>) {
    let addr = stream.peer_addr();
    let mut subscriptions = state.subscriptions.write().unwrap();

    for subscriptions in subscriptions.values_mut() {
        if let Some(i) = subscriptions.iter().position(|a| a == &addr) {
            subscriptions.swap_remove(i);
        }
    }
}

pub fn subscribe(state: Arc<State>, json: Value, addr: SocketAddr) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let set = get_string(&json, "set")?;

        state.subscribe(token, set, addr)?;

        Ok(json!({
            "success": true
        }))
    })
}

pub fn unsubscribe(state: Arc<State>, json: Value, addr: SocketAddr) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let set = get_string(&json, "set")?;

        state.unsubscribe(token, set, addr)?;

        Ok(json!({
            "success": true
        }))
    })
}
