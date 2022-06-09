//! Provides core functionality for set management.

use crate::server::user::User;
use crate::util::get_greek_letter;
use crate::voice::user::WrappedVoiceUser;
use crate::State;

use humphrey_json::prelude::*;
use mysql::{prelude::*, TxOpts};
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
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        let user: Option<String> = transaction
            .exec_first(
                "SELECT username FROM users WHERE token = ?",
                (token.as_ref(),),
            )
            .map_err(|_| "Could not check for invalid token".to_string())?;

        if user.is_none() {
            return Err("Invalid token".to_string());
        }

        let sets: Vec<(String, String, String, bool)> = transaction
            .exec(
                "SELECT sets.id, sets.name, sets.icon, memberships.admin FROM sets
                    JOIN memberships ON sets.id = memberships.set_id
                    JOIN users ON memberships.user_id = users.id
                    WHERE users.token = ?
                    ORDER BY memberships.creation_date ASC",
                (token.as_ref(),),
            )
            .map_err(|_| "Could not execute query".to_string())?;

        let mut full_sets: Vec<Set> = Vec::new();

        for (id, name, icon, admin) in sets {
            let subsets: Vec<Subset> = transaction
                .exec(
                    "SELECT id, name FROM subsets WHERE set_id = ? ORDER BY creation_date ASC",
                    (&id,),
                )
                .map_err(|_| "Could not get subsets".to_string())?
                .into_iter()
                .map(|(id, name)| Subset { id, name })
                .collect();

            let members: Vec<User> = transaction
                .exec(
                    "SELECT users.id, username, display_name, email, image, bio FROM users
                    JOIN memberships ON users.id = memberships.user_id
                    WHERE memberships.set_id = ?
                    ORDER BY display_name ASC",
                    (&id,),
                )
                .map_err(|_| "Could not get members".to_string())?
                .into_iter()
                .map(|(uid, username, display_name, email, image, bio)| User {
                    online: self.voice.is_user_online(&uid),
                    uid,
                    username,
                    display_name,
                    email,
                    image,
                    bio,
                })
                .collect();

            let voice_members = self.voice.get_channel_members(&id);

            let voice_members: Vec<WrappedVoiceUser> = members
                .clone()
                .into_iter()
                .filter(|member| voice_members.contains(&member.uid))
                .map(|user| WrappedVoiceUser {
                    peer_id: self.voice.get_peer_id(&user.uid).unwrap(),
                    user,
                })
                .collect();

            full_sets.push(Set {
                id,
                name,
                icon,
                admin,
                subsets,
                members,
                voice_members,
            });
        }

        crate::log!("User {} retrieved sets", user.unwrap());

        transaction
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())?;

        Ok(full_sets)
    }

    /// Gets the specific set.
    pub fn get_set(&self, token: impl AsRef<str>, id: impl AsRef<str>) -> Result<Set, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        let meta: Option<(bool, String)> = transaction
            .exec_first(
                "SELECT memberships.admin, users.id FROM memberships
                    JOIN users ON users.id = memberships.user_id
                    WHERE users.token = ? AND memberships.set_id = ?",
                (token.as_ref(), id.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if meta.is_none() {
            return Err("Not a member of this set".to_string());
        }

        let (is_admin, user) = meta.unwrap();

        let set: Option<Set> = transaction
            .exec_first(
                "SELECT id, name, icon FROM sets WHERE id = ?",
                (id.as_ref(),),
            )
            .map_err(|_| "Could not execute query".to_string())?
            .map(|(id, name, icon)| Set {
                id,
                name,
                icon,
                admin: is_admin,
                subsets: Vec::new(),
                members: Vec::new(),
                voice_members: Vec::new(),
            });

        if let Some(mut set) = set {
            let subsets: Vec<Subset> = transaction
                .exec(
                    "SELECT id, name FROM subsets WHERE set_id = ? ORDER BY creation_date ASC",
                    (&set.id,),
                )
                .map_err(|_| "Could not get subsets".to_string())?
                .into_iter()
                .map(|(id, name)| Subset { id, name })
                .collect();

            let members: Vec<User> = transaction
                .exec(
                    "SELECT users.id, username, display_name, email, image, bio FROM users
                    JOIN memberships ON users.id = memberships.user_id
                    WHERE memberships.set_id = ?
                    ORDER BY display_name ASC",
                    (&set.id,),
                )
                .map_err(|_| "Could not get members".to_string())?
                .into_iter()
                .map(|(uid, username, display_name, email, image, bio)| User {
                    online: self.voice.is_user_online(&uid),
                    uid,
                    username,
                    display_name,
                    email,
                    image,
                    bio,
                })
                .collect();

            let voice_members = self.voice.get_channel_members(&id);

            let voice_members: Vec<WrappedVoiceUser> = members
                .clone()
                .into_iter()
                .filter(|member| voice_members.contains(&member.uid))
                .map(|user| WrappedVoiceUser {
                    peer_id: self.voice.get_peer_id(&user.uid).unwrap(),
                    user,
                })
                .collect();

            set.subsets = subsets;
            set.members = members;
            set.voice_members = voice_members;

            crate::log!("User {} retrieved set {}", user, id.as_ref());

            transaction
                .commit()
                .map_err(|_| "Could not commit transaction".to_string())?;

            Ok(set)
        } else {
            Err("Could not find set".to_string())
        }
    }

    /// Creates a set with the given details. Automatically gives the creator admin rights.
    pub fn create_set(
        &self,
        token: impl AsRef<str>,
        name: impl AsRef<str>,
        icon: Option<String>,
    ) -> Result<String, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        let user_id: Option<String> = transaction
            .exec_first("SELECT id FROM users WHERE token = ?", (token.as_ref(),))
            .map_err(|_| "Could not get user by token".to_string())?;

        if user_id.is_none() {
            return Err("Invalid token".to_string());
        }

        let user_id = user_id.unwrap();

        let new_set_id = Uuid::new_v4().to_string();
        let new_membership_id = Uuid::new_v4().to_string();

        let icon = icon
            .unwrap_or_else(|| {
                get_greek_letter(name.as_ref().chars().next().unwrap_or(' ')).to_string()
            })
            .chars()
            .next()
            .unwrap_or('α')
            .to_string();

        transaction
            .exec_drop(
                "INSERT INTO sets (id, name, icon, creation_date) VALUES (?, ?, ?, NOW())",
                (&new_set_id, name.as_ref(), icon),
            )
            .map_err(|_| "Could not add new set".to_string())?;

        transaction.exec_drop(
            "INSERT INTO memberships (id, user_id, set_id, admin, creation_date) VALUES (?, ?, ?, 1, NOW())",
            (&new_membership_id, &user_id, &new_set_id),
        )
        .map_err(|_| "Could not add new membership".to_string())?;

        transaction.exec_drop(
            "INSERT INTO subsets (id, name, set_id, creation_date) VALUES (UUID(), \"General\", ?, NOW())",
            (&new_set_id,),
        )
        .map_err(|_| "Could not add General subset".to_string())?;

        crate::log!("User {} created set {}", user_id, new_set_id);

        transaction
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())?;

        Ok(new_set_id)
    }

    /// Creates a subset with the given name of the given set.
    pub fn create_subset(
        &self,
        token: impl AsRef<str>,
        set: impl AsRef<str>,
        name: impl AsRef<str>,
    ) -> Result<String, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        let meta: Option<(bool, String)> = transaction
            .exec_first(
                "SELECT memberships.admin, users.id FROM memberships
                    JOIN users ON memberships.user_id = users.id
                    WHERE users.token = ? AND memberships.set_id = ?",
                (token.as_ref(), set.as_ref()),
            )
            .map_err(|_| "Could not verify permissions".to_string())?;

        if meta.is_none() {
            return Err("Not a member of this set".to_string());
        }

        let (is_admin, user_id) = meta.unwrap();

        if !is_admin {
            return Err("Insuffient permissions".to_string());
        }

        let new_subset_id = Uuid::new_v4().to_string();

        transaction
            .exec_drop(
                "INSERT INTO subsets (id, set_id, name, creation_date) VALUES (?, ?, ?, NOW())",
                (&new_subset_id, set.as_ref(), name.as_ref()),
            )
            .map_err(|_| "Could not add new subset".to_string())?;

        self.broadcast_subset(set, &new_subset_id, name, false);

        crate::log!("User {} created subset {}", user_id, new_subset_id);

        transaction
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())?;

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
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        let (admin, set_id, subset_name, user_id): (bool, String, String, String) = transaction
            .exec_first(
                "SELECT memberships.admin, subsets.set_id, subsets.name, users.id FROM memberships
                    JOIN users ON memberships.user_id = users.id
                    JOIN subsets ON memberships.set_id = subsets.set_id
                    WHERE users.token = ? AND subsets.id = ?",
                (token.as_ref(), subset.as_ref()),
            )
            .map_err(|_| "Could not verify permissions".to_string())?
            .ok_or_else(|| "Not a member of this set".to_string())?;

        if !admin {
            return Err("Insuffient permissions".to_string());
        }

        if delete == Some(true) {
            transaction.exec_drop("DELETE FROM messages WHERE subset = ?", (subset.as_ref(),))
                .map_err(|_| "Could not delete messages".to_string())?;

            transaction
                .exec_drop("DELETE FROM subsets WHERE id = ?", (subset.as_ref(),))
                .map_err(|_| "Could not delete subset".to_string())?;

            self.broadcast_subset(set_id, &subset, subset_name, true);

            crate::log!("User {} deleted subset {}", user_id, subset.as_ref());
        } else if let Some(name) = name {
            transaction
                .exec_drop(
                    "UPDATE subsets SET name = ? WHERE id = ?",
                    (&name, subset.as_ref()),
                )
                .map_err(|_| "Could not update subset".to_string())?;

            self.broadcast_subset(set_id, &subset, name, false);

            crate::log!("User {} updated subset {}", user_id, subset.as_ref());
        }

        transaction
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())?;

        Ok(())
    }

    /// Adds the authenticated user to the given set.
    pub fn join_set(&self, token: impl AsRef<str>, set: impl AsRef<str>) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        #[allow(clippy::type_complexity)]
        let user: Option<(
            String,
            String,
            String,
            String,
            Option<String>,
            Option<String>,
        )> = transaction
            .exec_first(
                "SELECT id, username, display_name, email, image, bio FROM users WHERE token = ?",
                (token.as_ref(),),
            )
            .map_err(|_| "Invalid token".to_string())?;

        let user = user.map(|(uid, username, display_name, email, image, bio)| User {
            online: self.voice.is_user_online(&uid),
            uid,
            username,
            display_name,
            email,
            image,
            bio,
        });

        if user.is_none() {
            return Err("Invalid token".to_string());
        }

        let user = user.unwrap();

        let has_membership: Option<u8> = transaction
            .exec_first(
                "SELECT 1 FROM memberships WHERE user_id = ? AND set_id = ?",
                (&user.uid, set.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if has_membership.unwrap_or(0) != 0 {
            return Err("Already a member of this set".to_string());
        }

        let new_membership_id = Uuid::new_v4().to_string();

        transaction.exec_drop(
            "INSERT INTO memberships (id, user_id, set_id, admin, creation_date) VALUES (?, ?, ?, 0, NOW())",
            (&new_membership_id, &user.uid, set.as_ref()),
        )
        .map_err(|_| "Could not add new membership".to_string())?;

        let uid = user.uid.clone();

        self.broadcast_new_user(set.as_ref(), user);

        crate::log!("User {} joined set {}", uid, set.as_ref());

        transaction
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())?;

        Ok(())
    }

    /// Removes the authenticated user from the given set.
    pub fn leave_set(&self, token: impl AsRef<str>, set: impl AsRef<str>) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let user = self.get_user_by_token(token)?;
        let user_id = user.uid.clone();

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        let has_membership: Option<u8> = transaction
            .exec_first(
                "SELECT 1 FROM memberships WHERE user_id = ? AND set_id = ?",
                (&user_id, set.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if has_membership.unwrap_or(0) == 0 {
            return Err("Not a member of this set".to_string());
        }

        transaction
            .exec_drop(
                "DELETE FROM memberships WHERE user_id = ? AND set_id = ?",
                (&user_id, set.as_ref()),
            )
            .map_err(|_| "Could not remove membership".to_string())?;

        self.broadcast_left_user(set.as_ref(), user);

        crate::log!("User {} left set {}", user_id, set.as_ref());

        transaction
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())?;

        Ok(())
    }
}
