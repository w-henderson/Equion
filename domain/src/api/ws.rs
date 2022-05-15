use crate::api::{error_context, get_string, matcher, not_found};
use crate::voice;
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
                "v1/connectUserVoice" => voice::ws::connect_user_voice(state, json, addr),
                "v1/disconnectUserVoice" => voice::ws::disconnect_user_voice(state, json, addr),
                "v1/connectToVoiceChannel" => {
                    voice::ws::connect_to_voice_channel(state, json, addr)
                }
                "v1/leaveVoiceChannel" => voice::ws::leave_voice_channel(state, json, addr),
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

    let mut online_users = state.voice.online_users.write().unwrap();
    let voice_user = online_users
        .values()
        .find(|u| u.socket_addr == addr)
        .cloned();

    if let Some(voice_user) = voice_user {
        online_users.remove(&voice_user.uid);

        if let Some(channel) = voice_user.channel_id {
            let mut channels = state.voice.voice_channels.write().unwrap();

            if let Some(channel) = channels.get_mut(&channel) {
                if let Some(i) = channel.iter().position(|u| u == &voice_user.uid) {
                    channel.swap_remove(i);
                }
            }
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
