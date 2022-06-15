//! Provides core functionality for set management.

use std::time::UNIX_EPOCH;

use crate::server::user::User;
use crate::util::get_greek_letter;
use crate::voice::user::WrappedVoiceUser;
use crate::State;

use humphrey_json::prelude::*;
use uuid::Uuid;

/// Represents a set response from the server.
pub struct Set {
    /// The ID of the set.
    pub id: String,
    /// The name of the set.
    pub name: String,
    /// The icon of the set.
    pub icon: String,
    /// Whether the requesting user has administrative privileges for the set.
    pub admin: bool,
    /// The subsets of the set.
    pub subsets: Vec<Subset>,
    /// The members of the set.
    pub members: Vec<User>,
    /// The members of the set's voice chat.
    pub voice_members: Vec<WrappedVoiceUser>,
}

/// Represents a subset response from the server.
pub struct Subset {
    /// The ID of the subset.
    pub id: String,
    /// The name of the subset.
    pub name: String,
}

impl Set {
    /// Converts a row of the database to a set.
    pub(crate) fn from_row(row: (String, String, String, bool)) -> Self {
        Self {
            id: row.0,
            name: row.1,
            icon: row.2,
            admin: row.3,
            subsets: Vec::new(),
            members: Vec::new(),
            voice_members: Vec::new(),
        }
    }
}

impl Subset {
    /// Converts a row of the database to a subset.
    pub(crate) fn from_row(row: (String, String)) -> Self {
        Self {
            id: row.0,
            name: row.1,
        }
    }
}

json_map! {
    Set,
    id => "id",
    name => "name",
    icon => "icon",
    admin => "admin",
    subsets => "subsets",
    members => "members",
    voice_members => "voiceMembers"
}

json_map! {
    Subset,
    id => "id",
    name => "name"
}

impl State {
    /// Gets all the sets for the authenticated uesr.
    pub fn get_sets(&self, token: impl AsRef<str>) -> Result<Vec<Set>, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let user = transaction.select_username_by_token(token.as_ref())?;

        if user.is_none() {
            return Err("Invalid token".to_string());
        }

        let sets: Result<Vec<Set>, String> = transaction
            .select_sets_by_token(token.as_ref())?
            .into_iter()
            .map(|mut set| {
                set.subsets = transaction.select_subsets_by_set(&set.id)?;

                set.members = transaction
                    .select_users_by_set(&set.id)?
                    .into_iter()
                    .map(|mut user| {
                        user.online = self.voice.is_user_online(&user.uid);
                        user
                    })
                    .collect();

                let voice_members = self.voice.get_channel_members(&set.id);

                set.voice_members = set
                    .members
                    .clone()
                    .into_iter()
                    .filter(|member| voice_members.contains(&member.uid))
                    .map(|user| WrappedVoiceUser {
                        peer_id: self.voice.get_peer_id(&user.uid).unwrap(),
                        user,
                    })
                    .collect();

                Ok(set)
            })
            .collect();

        let sets = sets?;

        transaction.commit()?;

        crate::log!("User {} retrieved sets", user.unwrap());

        Ok(sets)
    }

    /// Gets the specific set.
    pub fn get_set(&self, token: impl AsRef<str>, id: impl AsRef<str>) -> Result<Set, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let set: Option<Result<Set, String>> = transaction
            .select_set_by_id_and_token(token.as_ref(), id.as_ref())?
            .map(|mut set| {
                set.subsets = transaction.select_subsets_by_set(&set.id)?;

                set.members = transaction
                    .select_users_by_set(&set.id)?
                    .into_iter()
                    .map(|mut user| {
                        user.online = self.voice.is_user_online(&user.uid);
                        user
                    })
                    .collect();

                let voice_members = self.voice.get_channel_members(&set.id);

                set.voice_members = set
                    .members
                    .clone()
                    .into_iter()
                    .filter(|member| voice_members.contains(&member.uid))
                    .map(|user| WrappedVoiceUser {
                        peer_id: self.voice.get_peer_id(&user.uid).unwrap(),
                        user,
                    })
                    .collect();

                Ok(set)
            });

        if let Some(set) = set {
            let set = set?;

            transaction.commit()?;

            crate::log!("User {} retrieved set {}", token.as_ref(), id.as_ref());

            Ok(set)
        } else {
            Err("Set not found".to_string())
        }
    }

    /// Creates a set with the given details. Automatically gives the creator admin rights.
    pub fn create_set(
        &self,
        token: impl AsRef<str>,
        name: impl AsRef<str>,
        icon: Option<String>,
    ) -> Result<String, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let user_id = transaction.select_id_by_token(token.as_ref())?;

        if user_id.is_none() {
            return Err("Invalid token".to_string());
        }

        let user_id = user_id.unwrap();

        let new_set_id = Uuid::new_v4().to_string();
        let new_membership_id = Uuid::new_v4().to_string();
        let new_subset_id = Uuid::new_v4().to_string();

        let icon = icon
            .unwrap_or_else(|| {
                get_greek_letter(name.as_ref().chars().next().unwrap_or(' ')).to_string()
            })
            .chars()
            .next()
            .unwrap_or('α')
            .to_string();

        transaction.insert_set(&new_set_id, name.as_ref(), &icon)?;
        transaction.insert_membership(&new_membership_id, &user_id, &new_set_id, true)?;
        transaction.insert_subset(&new_subset_id, "General", &new_set_id)?;

        transaction.commit()?;

        crate::log!("User {} created set {}", user_id, new_set_id);

        Ok(new_set_id)
    }

    /// Creates a subset with the given name of the given set.
    pub fn create_subset(
        &self,
        token: impl AsRef<str>,
        set: impl AsRef<str>,
        name: impl AsRef<str>,
    ) -> Result<String, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let membership = transaction.select_membership(token.as_ref(), set.as_ref())?;

        if membership.is_none() {
            return Err("Not a member of this set".to_string());
        }

        let (is_admin, user_id) = membership.unwrap();

        if !is_admin {
            return Err("Insuffient permissions".to_string());
        }

        let new_subset_id = Uuid::new_v4().to_string();

        transaction.insert_subset(&new_subset_id, name.as_ref(), set.as_ref())?;

        crate::log!("User {} created subset {}", user_id, new_subset_id);

        self.broadcast_subset(set, &new_subset_id, name, false);

        transaction.commit()?;

        Ok(new_subset_id)
    }

    /// Updates or deletes the given subset.
    pub fn update_subset(
        &self,
        token: impl AsRef<str>,
        subset: impl AsRef<str>,
        name: Option<String>,
        delete: Option<bool>,
    ) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let (admin, set_id, subset_name, user_id) = transaction
            .select_subset_metadata_for_update(token.as_ref(), subset.as_ref())?
            .ok_or_else(|| "Not a member of this set".to_string())?;

        if !admin {
            return Err("Insuffient permissions".to_string());
        }

        if delete == Some(true) {
            transaction.delete_subset_messages(subset.as_ref())?;
            transaction.delete_subset(subset.as_ref())?;
            transaction.commit()?;

            self.broadcast_subset(set_id, &subset, subset_name, true);

            crate::log!("User {} deleted subset {}", user_id, subset.as_ref());
        } else if let Some(name) = name {
            transaction.update_subset_name(&name, subset.as_ref())?;
            transaction.commit()?;

            self.broadcast_subset(set_id, &subset, name, false);

            crate::log!("User {} updated subset {}", user_id, subset.as_ref());
        }

        Ok(())
    }

    /// Adds the authenticated user to the set with the given invite code.
    pub fn join_set(&self, token: impl AsRef<str>, invite: impl AsRef<str>) -> Result<String, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let user = transaction
            .select_user_by_token(token.as_ref())?
            .map(|mut user| {
                user.online = self.voice.is_user_online(&user.uid);
                user
            })
            .ok_or_else(|| "Invalid token".to_string())?;

        let invite = transaction
            .select_invite_by_code(invite.as_ref())?
            .ok_or_else(|| "Invalid invite code".to_string())?;

        if invite
            .expires
            .map(|expires| expires < UNIX_EPOCH.elapsed().unwrap().as_secs())
            .unwrap_or(false)
        {
            return Err("Invite code expired".to_string());
        }

        if transaction.select_user_has_membership(&user.uid, &invite.set_id)? {
            return Err("Already a member of this set".to_string());
        }

        let new_membership_id = Uuid::new_v4().to_string();
        transaction.insert_membership(&new_membership_id, &user.uid, &invite.set_id, false)?;
        transaction.increment_invite_uses(&invite.id)?;
        transaction.commit()?;

        let uid = user.uid.clone();

        self.broadcast_new_user(&invite.set_id, user);

        crate::log!("User {} joined set {}", uid, &invite.set_id);

        Ok(invite.set_id)
    }

    /// Removes the authenticated user from the given set.
    pub fn leave_set(&self, token: impl AsRef<str>, set: impl AsRef<str>) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let user = transaction
            .select_user_by_token(token.as_ref())?
            .map(|mut user| {
                user.online = self.voice.is_user_online(&user.uid);
                user
            });

        if user.is_none() {
            return Err("Invalid token".to_string());
        }

        let user = user.unwrap();
        let user_id = user.uid.clone();

        let has_membership = transaction.select_user_has_membership(&user_id, set.as_ref())?;

        if !has_membership {
            return Err("Not a member of this set".to_string());
        }

        transaction.delete_membership(&user_id, set.as_ref())?;
        transaction.commit()?;

        self.broadcast_left_user(set.as_ref(), user);

        crate::log!("User {} left set {}", user_id, set.as_ref());

        Ok(())
    }
}
