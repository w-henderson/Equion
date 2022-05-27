//! Provides WebSocket handlers for voice chat events.

use crate::api::{error_context, get_string};
use crate::voice::user::WrappedVoiceUser;
use crate::State;

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::net::SocketAddr;
use std::sync::Arc;

/// Parses the JSON body of the request, and if valid, connects the user to the voice chat server.
pub fn connect_user_voice(state: Arc<State>, json: Value, addr: SocketAddr) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let peer_id = get_string(&json, "peerId")?;
        let user = state.get_user_by_token(token)?;

        state.voice.connect_user_voice(user.uid, peer_id, addr);

        Ok(json!({ "success": true }))
    })
}

/// Parses the JSON body of the request, and if valid, disconnects the user from the voice chat server.
pub fn disconnect_user_voice(state: Arc<State>, json: Value, _: SocketAddr) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let user = state.get_user_by_token(token)?;

        state.voice.disconnect_user_voice(user.uid);

        Ok(json!({ "success": true }))
    })
}

/// Parses the JSON body of the request, and if valid, connects the user to the voice channel.
pub fn connect_to_voice_channel(state: Arc<State>, json: Value, _: SocketAddr) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let channel_id = get_string(&json, "channel")?;

        let user = state.get_user_by_token(token)?;

        if let Some(channel_id) = state.voice.get_user_channel(&user.uid) {
            state.voice.leave_voice_channel(&user.uid)?;
            state.broadcast_left_vc(channel_id, &user.uid);
        }

        let peer_id = state
            .voice
            .connect_to_voice_channel(&user.uid, &channel_id)?;

        state.broadcast_joined_vc(channel_id, WrappedVoiceUser { user, peer_id });

        Ok(json!({ "success": true }))
    })
}

/// Parses the JSON body of the request, and if valid, disconnects the user from the voice channel.
pub fn leave_voice_channel(state: Arc<State>, json: Value, _: SocketAddr) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;

        let user = state.get_user_by_token(token)?;
        let channel_id = state
            .voice
            .get_user_channel(&user.uid)
            .ok_or("User is not in a voice channel")?;

        state.voice.leave_voice_channel(&user.uid)?;

        state.broadcast_left_vc(channel_id, &user.uid);

        Ok(json!({ "success": true }))
    })
}
