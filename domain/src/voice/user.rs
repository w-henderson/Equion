//! Provides the voice user type.

use crate::server::user::User;

use humphrey_json::prelude::*;

/// Represents a user in a voice chat, used in API responses.
pub struct WrappedVoiceUser {
    /// The user.
    pub user: User,
    /// The user's peer ID, as used by PeerJS.
    pub peer_id: String,
}

json_map! {
    WrappedVoiceUser,
    user => "user",
    peer_id => "peerId"
}
