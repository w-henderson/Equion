//! Provides the WebSocket interface for routing events.

use crate::api::{error_context, get_string, matcher};
use crate::voice;
use crate::voice::user::WrappedVoiceUser;
use crate::State;

use humphrey_ws::{AsyncStream, Message};

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::net::SocketAddr;
use std::sync::Arc;

/// The core WebSocket request handler.
///
/// This also handles voice chat WebSocket messages, since these cannot use HTTP.
pub fn handler(stream: AsyncStream, message: Message, state: Arc<State>) {
    let input = message
        .text()
        .map(|s| s.to_string())
        .and_then(|s| humphrey_json::from_str(s).ok());

    let addr = stream.peer_addr();

    let response = handler_internal(input, addr, state);

    let serialized = response.serialize();

    if !response
        .get("success")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        crate::log!(
            "{} WebSocket Error: {}",
            addr,
            response.get("error").and_then(|v| v.as_str()).unwrap()
        );
    }

    let message = Message::new(serialized);

    stream.send(message);
}

/// Handles WebSocket requests.
///
/// This is a separate function to `handler` to allow for easier testing.
pub fn handler_internal(input: Option<Value>, addr: SocketAddr, state: Arc<State>) -> Value {
    let json: Option<(Value, String, Option<String>)> = input.and_then(|v: Value| {
        let command = get_string(&v, "command").ok()?;
        let id = get_string(&v, "requestId").ok();
        Some((v, command, id))
    });

    let response_body: Value = if let Some((json, command, id)) = json {
        let handler = matcher(&command);

        let mut response = match handler {
            Some(handler) => handler(state, json),
            None => match command.as_str() {
                "v1/subscribe" => subscribe(state, json, addr),
                "v1/unsubscribe" => unsubscribe(state, json, addr),
                "v1/connectUserVoice" => voice::ws::connect_user_voice(state, json, addr),
                "v1/disconnectUserVoice" => voice::ws::disconnect_user_voice(state, json, addr),
                "v1/connectToVoiceChannel" => {
                    voice::ws::connect_to_voice_channel(state, json, addr)
                }
                "v1/leaveVoiceChannel" => voice::ws::leave_voice_channel(state, json, addr),
                "v1/ping" => ping(),
                _ => json!({
                    "success": false,
                    "error": "Invalid command"
                }),
            },
        };

        if matches!(response, Value::Object(_)) {
            if let Some(id) = id {
                response["requestId"] = Value::String(id);
            }
        }

        response
    } else {
        json!({
            "success": false,
            "error": "Invalid JSON"
        })
    };

    response_body
}

/// Subscribes the user to events for the specified set.
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

/// Unsubscribes the user from events for the specified set.
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

/// Unsubscribes the given stream from all events.
pub fn unsubscribe_all(stream: AsyncStream, state: Arc<State>) {
    let addr = stream.peer_addr();
    let mut subscriptions = state.subscriptions.write().unwrap();

    for subscriptions in subscriptions.values_mut() {
        if let Some(i) = subscriptions.iter().position(|a| a == &addr) {
            subscriptions.swap_remove(i);
        }
    }

    drop(subscriptions);

    let voice_user = {
        let online_users = state.voice.online_users.read().unwrap();
        online_users
            .values()
            .find(|u| u.socket_addr == addr)
            .cloned()
    };

    if let Some(voice_user) = voice_user {
        if let Some(channel_id) = voice_user.channel_id {
            if let Ok(user) = state.get_user(&voice_user.uid) {
                state.voice.leave_voice_channel(&voice_user.uid).ok();
                state.broadcast_left_vc(
                    channel_id,
                    WrappedVoiceUser {
                        user,
                        peer_id: voice_user.peer_id,
                    },
                );
            }
        }

        state.voice.disconnect_user_voice(&voice_user.uid);
        state.broadcast_user_offline(&voice_user.uid);
    }
}

/// Returns a `v1/pong` event.
pub fn ping() -> Value {
    json!({
        "success": true,
        "event": "v1/pong"
    })
}
