//! Provides the voice chat server implementation.

pub mod user;
pub mod ws;

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::RwLock;

/// Represents the voice chat server.
#[derive(Default)]
pub struct VoiceServer {
    /// Hashmap of user IDs to voice user data.
    pub online_users: RwLock<HashMap<String, VoiceUser>>,
    /// Hashmap of channel IDs to lists of user IDs.
    pub voice_channels: RwLock<HashMap<String, Vec<String>>>,
}

/// Represents a user connected to the voice chat server, whether they are in a voice chat or not.
#[derive(Clone)]
pub struct VoiceUser {
    /// The ID of the user, as used in the database.
    pub uid: String,
    /// The ID of the channel the user is currently in, if any.
    pub channel_id: Option<String>,
    /// The socket address of the user's WebSocket connection to the server.
    pub socket_addr: SocketAddr,
    /// The peer ID of the user for WebRTC, used by PeerJS to identify the user.
    pub peer_id: String,
}

impl VoiceServer {
    /// Creates a new empty voice server.
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns whether the user with the given ID is online.
    pub fn is_user_online(&self, uid: impl AsRef<str>) -> bool {
        self.online_users.read().unwrap().contains_key(uid.as_ref())
    }

    /// Connects a user to the voice chat server.
    pub fn connect_user_voice(
        &self,
        uid: impl AsRef<str>,
        peer_id: impl AsRef<str>,
        addr: SocketAddr,
    ) {
        let mut online_users = self.online_users.write().unwrap();

        online_users.insert(
            uid.as_ref().to_string(),
            VoiceUser {
                uid: uid.as_ref().to_string(),
                channel_id: None,
                socket_addr: addr,
                peer_id: peer_id.as_ref().to_string(),
            },
        );

        crate::log!(
            Debug,
            "User {} connected to voice server with peer ID {}",
            uid.as_ref(),
            peer_id.as_ref()
        );
    }

    /// Disconnects a user from the voice chat server.
    pub fn disconnect_user_voice(&self, uid: impl AsRef<str>) {
        let mut online_users = self.online_users.write().unwrap();
        online_users.remove(uid.as_ref());

        crate::log!(
            Debug,
            "User {} disconnected from voice server",
            uid.as_ref()
        );
    }

    /// Gets the IDs of the members of the given channel.
    pub fn get_channel_members(&self, channel_id: impl AsRef<str>) -> Vec<String> {
        let voice_channels = self.voice_channels.read().unwrap();

        voice_channels
            .get(channel_id.as_ref())
            .cloned()
            .unwrap_or_default()
    }

    /// Gets the peer ID of the given user.
    pub fn get_peer_id(&self, uid: impl AsRef<str>) -> Option<String> {
        let online_users = self.online_users.read().unwrap();

        online_users
            .get(uid.as_ref())
            .map(|user| user.peer_id.clone())
    }

    /// Gets a voice user by ID.
    pub fn get_user(&self, uid: impl AsRef<str>) -> Option<VoiceUser> {
        let online_users = self.online_users.read().unwrap();

        online_users.get(uid.as_ref()).cloned()
    }

    /// Connects the given user to a voice channel.
    pub fn connect_to_voice_channel(
        &self,
        uid: impl AsRef<str>,
        channel_id: impl AsRef<str>,
    ) -> Result<String, String> {
        let mut online_users = self.online_users.write().unwrap();
        let mut voice_channels = self.voice_channels.write().unwrap();

        let channel = channel_id.as_ref().to_string();
        let user = uid.as_ref().to_string();

        let peer_id = if let Some(user) = online_users.get_mut(&user) {
            user.channel_id = Some(channel.clone());
            user.peer_id.clone()
        } else {
            return Err("User not connected to voice server".to_string());
        };

        let entry = voice_channels.entry(channel).or_insert_with(Vec::new);

        if !entry.contains(&user) {
            entry.push(user);
        } else {
            return Err("User already in voice channel".to_string());
        }

        crate::log!(
            "User {} connected to voice channel {}",
            uid.as_ref(),
            channel_id.as_ref()
        );

        Ok(peer_id)
    }

    /// Disconnects the given user from a voice channel.
    pub fn leave_voice_channel(&self, uid: impl AsRef<str>) -> Result<(), String> {
        let mut online_users = self.online_users.write().unwrap();
        let mut voice_channels = self.voice_channels.write().unwrap();

        let channel_id = online_users
            .get_mut(uid.as_ref())
            .and_then(|user| user.channel_id.take())
            .ok_or_else(|| "User not connected to voice channel".to_string())?;

        let entry = voice_channels.get_mut(&channel_id).unwrap();

        if let Some(i) = entry.iter().position(|u| u == uid.as_ref()) {
            entry.swap_remove(i);
        }

        crate::log!(
            "User {} disconnected from voice channel {}",
            uid.as_ref(),
            channel_id
        );

        Ok(())
    }
}
