use crate::util::get_greek_letter;
use crate::State;

use humphrey_json::prelude::*;
use mysql::prelude::*;
use uuid::Uuid;

pub struct Set {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub subsets: Vec<Subset>,
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
    subsets => "subsets"
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

        let valid_token: Option<u8> = conn
            .exec_first("SELECT 1 FROM users WHERE token = ?", (token.as_ref(),))
            .map_err(|_| "Could not check for invalid token".to_string())?;
        let valid_token = valid_token.unwrap_or(0) != 0;

        if !valid_token {
            return Err("Invalid token".to_string());
        }

        let sets: Vec<(String, String, String)> = conn
            .exec(
                "SELECT sets.id, sets.name, sets.icon FROM sets
                    JOIN memberships ON sets.id = memberships.set_id
                    JOIN users ON memberships.user_id = users.id
                    WHERE users.token = ?",
                (token.as_ref(),),
            )
            .map_err(|_| "Could not execute query".to_string())?;

        let mut full_sets: Vec<Set> = Vec::new();

        for (id, name, icon) in sets {
            let subsets: Vec<Subset> = conn
                .exec("SELECT id, name FROM subsets WHERE set_id = ?", (&id,))
                .map_err(|_| "Could not execute query".to_string())?
                .into_iter()
                .map(|(id, name)| Subset { id, name })
                .collect();

            full_sets.push(Set {
                id,
                name,
                icon,
                subsets,
            });
        }

        Ok(full_sets)
    }

    pub fn get_set(&self, token: impl AsRef<str>, id: impl AsRef<str>) -> Result<Set, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let has_membership: Option<u8> = conn
            .exec_first(
                "SELECT 1 FROM memberships
                    JOIN users ON users.id = memberships.user_id
                    WHERE users.token = ? AND memberships.set_id = ?",
                (token.as_ref(), id.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if has_membership.unwrap_or(0) == 0 {
            return Err("Not a member of this set".to_string());
        }

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
                subsets: Vec::new(),
            });

        if let Some(mut set) = set {
            let subsets: Vec<Subset> = conn
                .exec("SELECT id, name FROM subsets WHERE set_id = ?", (&set.id,))
                .map_err(|_| "Could not execute query".to_string())?
                .into_iter()
                .map(|(id, name)| Subset { id, name })
                .collect();

            set.subsets = subsets;

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

        let icon = icon.unwrap_or_else(|| {
            get_greek_letter(name.as_ref().chars().next().unwrap_or(' ')).to_string()
        });

        conn.exec_drop(
            "INSERT INTO sets (id, name, icon) VALUES (?, ?, ?)",
            (&new_set_id, name.as_ref(), icon),
        )
        .map_err(|_| "Could not add new set".to_string())?;

        conn.exec_drop(
            "INSERT INTO memberships (id, user_id, set_id, admin) VALUES (?, ?, ?, 1)",
            (&new_membership_id, &user_id, &new_set_id),
        )
        .map_err(|_| "Could not add new membership".to_string())?;

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

        let has_admin_perms: Option<u8> = conn
            .exec_first(
                "SELECT memberships.admin FROM memberships
                    JOIN users ON memberships.user_id = users.id
                    WHERE users.token = ? AND memberships.set_id = ?",
                (token.as_ref(), set.as_ref()),
            )
            .map_err(|_| "Could not verify permissions".to_string())?;

        if has_admin_perms.unwrap_or(0) == 0 {
            return Err("Insuffient permissions".to_string());
        }

        let new_subset_id = Uuid::new_v4().to_string();

        conn.exec_drop(
            "INSERT INTO subsets (id, set_id, name) VALUES (?, ?, ?)",
            (&new_subset_id, set.as_ref(), name.as_ref()),
        )
        .map_err(|_| "Could not add new subset".to_string())?;

        Ok(new_subset_id)
    }

    pub fn join_set(&self, token: impl AsRef<str>, set: impl AsRef<str>) -> Result<(), String> {
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

        if has_membership.unwrap_or(0) != 0 {
            return Err("Already a member of this set".to_string());
        }

        let new_membership_id = Uuid::new_v4().to_string();

        conn.exec_drop(
            "INSERT INTO memberships (id, user_id, set_id, admin) VALUES (?, ?, ?, 0)",
            (&new_membership_id, &user_id, set.as_ref()),
        )
        .map_err(|_| "Could not add new membership".to_string())?;

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

        Ok(())
    }
}
