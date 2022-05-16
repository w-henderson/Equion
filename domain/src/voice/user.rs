use crate::server::user::User;

use humphrey_json::prelude::*;

pub struct WrappedVoiceUser {
    pub user: User,
    pub peer_id: String,
}

json_map! {
    WrappedVoiceUser,
    user => "user",
    peer_id => "peerId"
}
