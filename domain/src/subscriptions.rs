use crate::State;

use mysql::prelude::*;

use std::collections::hash_map::Entry;
use std::net::SocketAddr;

impl State {
    pub fn subscribe(
        &self,
        token: impl AsRef<str>,
        set: impl AsRef<str>,
        addr: SocketAddr,
    ) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let has_membership: Option<u8> = conn
            .exec_first(
                "SELECT 1 FROM memberships
                    JOIN users ON users.id = memberships.user_id
                    WHERE users.token = ? AND memberships.set_id = ?",
                (token.as_ref(), set.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if has_membership.unwrap_or(0) == 0 {
            return Err("Not a member of this set".to_string());
        }

        let mut subscriptions = self.subscriptions.write().unwrap();

        match subscriptions.entry(set.as_ref().to_string()) {
            Entry::Vacant(entry) => {
                entry.insert(vec![addr]);
            }
            Entry::Occupied(mut entry) => {
                if entry.get().contains(&addr) {
                    return Err("Already subscribed".to_string());
                } else {
                    entry.get_mut().push(addr);
                }
            }
        }

        Ok(())
    }

    pub fn unsubscribe(
        &self,
        token: impl AsRef<str>,
        set: impl AsRef<str>,
        addr: SocketAddr,
    ) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let has_membership: Option<u8> = conn
            .exec_first(
                "SELECT 1 FROM memberships
                    JOIN users ON users.id = memberships.user_id
                    WHERE users.token = ? AND memberships.set_id = ?",
                (token.as_ref(), set.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if has_membership.unwrap_or(0) == 0 {
            return Err("Not a member of this set".to_string());
        }

        let mut subscriptions = self.subscriptions.write().unwrap();

        match subscriptions.entry(set.as_ref().to_string()) {
            Entry::Vacant(entry) => {
                entry.insert(vec![addr]);
            }
            Entry::Occupied(mut entry) => {
                if let Some(i) = entry.get().iter().position(|a| a == &addr) {
                    entry.get_mut().swap_remove(i);
                } else {
                    return Err("Not subscribed".to_string());
                }
            }
        }

        Ok(())
    }
}
