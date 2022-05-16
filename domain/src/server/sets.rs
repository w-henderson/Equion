use crate::server::user::User;
use crate::util::get_greek_letter;
use crate::voice::user::WrappedVoiceUser;
use crate::State;

use humphrey_json::prelude::*;
use mysql::prelude::*;
use uuid::Uuid;

pub struct Set {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub admin: bool,
    pub subsets: Vec<Subset>,
    pub members: Vec<User>,
    pub voice_members: Vec<WrappedVoiceUser>,
}

pub struct Subset {
    pub id: String,
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
    pub fn get_sets(&self, token: impl AsRef<str>) -> Result<Vec<Set>, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let user: Option<String> = conn
            .exec_first(
                "SELECT username FROM users WHERE token = ?",
                (token.as_ref(),),
            )
            .map_err(|_| "Could not check for invalid token".to_string())?;

        if user.is_none() {
            return Err("Invalid token".to_string());
        }

        let sets: Vec<(String, String, String, bool)> = conn
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
            let subsets: Vec<Subset> = conn
                .exec(
                    "SELECT id, name FROM subsets WHERE set_id = ? ORDER BY creation_date ASC",
                    (&id,),
                )
                .map_err(|_| "Could not get subsets".to_string())?
                .into_iter()
                .map(|(id, name)| Subset { id, name })
                .collect();

            let members: Vec<User> = conn
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

        Ok(full_sets)
    }

    pub fn get_set(&self, token: impl AsRef<str>, id: impl AsRef<str>) -> Result<Set, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let meta: Option<(bool, String)> = conn
            .exec_first(
                "SELECT memberships.admin FROM memberships
                    JOIN users ON users.id = memberships.user_id
                    WHERE users.token = ? AND memberships.set_id = ?",
                (token.as_ref(), id.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if meta.is_none() {
            return Err("Not a member of this set".to_string());
        }

        let (is_admin, user) = meta.unwrap();

        let set: Option<Set> = conn
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
            let subsets: Vec<Subset> = conn
                .exec(
                    "SELECT id, name FROM subsets WHERE set_id = ? ORDER BY creation_date ASC",
                    (&set.id,),
                )
                .map_err(|_| "Could not get subsets".to_string())?
                .into_iter()
                .map(|(id, name)| Subset { id, name })
                .collect();

            let members: Vec<User> = conn
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

            Ok(set)
        } else {
            Err("Could not find set".to_string())
        }
    }

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

        let user_id: Option<String> = conn
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

        conn.exec_drop(
            "INSERT INTO sets (id, name, icon, creation_date) VALUES (?, ?, ?, NOW())",
            (&new_set_id, name.as_ref(), icon),
        )
        .map_err(|_| "Could not add new set".to_string())?;

        conn.exec_drop(
            "INSERT INTO memberships (id, user_id, set_id, admin, creation_date) VALUES (?, ?, ?, 1, NOW())",
            (&new_membership_id, &user_id, &new_set_id),
        )
        .map_err(|_| "Could not add new membership".to_string())?;

        conn.exec_drop(
            "INSERT INTO subsets (id, name, set_id, creation_date) VALUES (UUID(), \"General\", ?, NOW())",
            (&new_set_id,),
        )
        .map_err(|_| "Could not add General subset".to_string())?;

        crate::log!("User {} created set {}", user_id, new_set_id);

        Ok(new_set_id)
    }

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

        let meta: Option<(bool, String)> = conn
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

        conn.exec_drop(
            "INSERT INTO subsets (id, set_id, name, creation_date) VALUES (?, ?, ?, NOW())",
            (&new_subset_id, set.as_ref(), name.as_ref()),
        )
        .map_err(|_| "Could not add new subset".to_string())?;

        self.broadcast_new_subset(set, &new_subset_id, name);

        crate::log!("User {} created subset {}", user_id, new_subset_id);

        Ok(new_subset_id)
    }

    pub fn join_set(&self, token: impl AsRef<str>, set: impl AsRef<str>) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        #[allow(clippy::type_complexity)]
        let user: Option<(
            String,
            String,
            String,
            String,
            Option<String>,
            Option<String>,
        )> = conn
            .exec_first(
                "SELECT id, username, display_name, email, image, bio FROM users WHERE token = ?",
                (token.as_ref(),),
            )
            .map_err(|_| "Invalid token".to_string())?;

        let user = user.map(|(uid, username, display_name, email, image, bio)| User {
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

        let has_membership: Option<u8> = conn
            .exec_first(
                "SELECT 1 FROM memberships WHERE user_id = ? AND set_id = ?",
                (&user.uid, set.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if has_membership.unwrap_or(0) != 0 {
            return Err("Already a member of this set".to_string());
        }

        let new_membership_id = Uuid::new_v4().to_string();

        conn.exec_drop(
            "INSERT INTO memberships (id, user_id, set_id, admin, creation_date) VALUES (?, ?, ?, 0, NOW())",
            (&new_membership_id, &user.uid, set.as_ref()),
        )
        .map_err(|_| "Could not add new membership".to_string())?;

        let uid = user.uid.clone();

        self.broadcast_new_user(set.as_ref(), user);

        crate::log!("User {} joined set {}", uid, set.as_ref());

        Ok(())
    }

    pub fn leave_set(&self, token: impl AsRef<str>, set: impl AsRef<str>) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let user_id: Option<String> = conn
            .exec_first("SELECT id FROM users WHERE token = ?", (token.as_ref(),))
            .map_err(|_| "Could not get user by token".to_string())?;

        if user_id.is_none() {
            return Err("Invalid token".to_string());
        }

        let user_id = user_id.unwrap();

        let has_membership: Option<u8> = conn
            .exec_first(
                "SELECT 1 FROM memberships WHERE user_id = ? AND set_id = ?",
                (&user_id, set.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if has_membership.unwrap_or(0) == 0 {
            return Err("Not a member of this set".to_string());
        }

        conn.exec_drop(
            "DELETE FROM memberships WHERE user_id = ? AND set_id = ?",
            (&user_id, set.as_ref()),
        )
        .map_err(|_| "Could not remove membership".to_string())?;

        self.broadcast_left_user(set.as_ref(), &user_id);

        crate::log!("User {} left set {}", user_id, set.as_ref());

        Ok(())
    }
}
