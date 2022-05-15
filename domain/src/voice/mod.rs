pub mod user;
pub mod ws;

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::RwLock;

#[derive(Default)]
pub struct VoiceServer {
    /// Hashmap of user IDs to voice user data.
    pub online_users: RwLock<HashMap<String, VoiceUser>>,
    /// Hashmap of channel IDs to lists of user IDs.
    pub voice_channels: RwLock<HashMap<String, Vec<String>>>,
}

#[derive(Clone)]
pub struct VoiceUser {
    pub uid: String,
    pub channel_id: Option<String>,
    pub socket_addr: SocketAddr,
    pub peer_id: String,
}

impl VoiceServer {
    pub fn new() -> Self {
        Self::default()
    }

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
    }

    pub fn disconnect_user_voice(&self, uid: impl AsRef<str>) {
        let mut online_users = self.online_users.write().unwrap();
        online_users.remove(uid.as_ref());
    }

    pub fn get_channel_members(&self, channel_id: impl AsRef<str>) -> Vec<String> {
        let voice_channels = self.voice_channels.read().unwrap();

        voice_channels
            .get(channel_id.as_ref())
            .cloned()
            .unwrap_or_default()
    }

    pub fn get_user_channel(&self, uid: impl AsRef<str>) -> Option<String> {
        let online_users = self.online_users.read().unwrap();

        online_users
            .get(uid.as_ref())
            .and_then(|user| user.channel_id.clone())
    }

    pub fn connect_to_voice_channel(
        &self,
        uid: impl AsRef<str>,
        channel_id: impl AsRef<str>,
    ) -> Result<String, String> {
        let mut online_users = self.online_users.write().unwrap();
        let mut voice_channels = self.voice_channels.write().unwrap();

        let channel_id = channel_id.as_ref().to_string();
        let uid = uid.as_ref().to_string();

        let peer_id = if let Some(user) = online_users.get_mut(&uid) {
            user.channel_id = Some(channel_id.clone());
            user.peer_id.clone()
        } else {
            return Err("User not connected to voice server".to_string());
        };

        let entry = voice_channels.entry(channel_id).or_insert_with(Vec::new);

        if !entry.contains(&uid) {
            entry.push(uid);
        } else {
            return Err("User already in voice channel".to_string());
        }

        Ok(peer_id)
    }

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

        Ok(())
    }
}
