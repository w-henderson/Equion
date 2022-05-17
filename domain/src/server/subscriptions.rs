use crate::server::messages;
use crate::server::user::User;
use crate::voice::user::WrappedVoiceUser;
use crate::State;

use humphrey_ws::Message;

use humphrey_json::prelude::*;

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

        let user: Option<String> = conn
            .exec_first(
                "SELECT memberships.user_id FROM memberships
                    JOIN users ON users.id = memberships.user_id
                    WHERE users.token = ? AND memberships.set_id = ?",
                (token.as_ref(), set.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if user.is_none() {
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

        crate::log!(
            Debug,
            "User {} subscribed to set {}",
            user.unwrap(),
            set.as_ref()
        );

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

        let user: Option<String> = conn
            .exec_first(
                "SELECT memberships.user_id FROM memberships
                    JOIN users ON users.id = memberships.user_id
                    WHERE users.token = ? AND memberships.set_id = ?",
                (token.as_ref(), set.as_ref()),
            )
            .map_err(|_| "Could not verify membership".to_string())?;

        if user.is_none() {
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

        crate::log!(
            Debug,
            "User {} unsubscribed from set {}",
            user.unwrap(),
            set.as_ref()
        );

        Ok(())
    }

    pub fn broadcast_new_subset(
        &self,
        set: impl AsRef<str>,
        id: impl AsRef<str>,
        name: impl AsRef<str>,
    ) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/newSubset",
                "set": (set.as_ref()),
                "subset": {
                    "id": (id.as_ref()),
                    "name": (name.as_ref())
                }
            })
            .serialize(),
        );

        if let Some(subscriptions) = subscriptions.get(set.as_ref()) {
            let locked_sender = self.global_sender.lock().unwrap();
            let sender = locked_sender.as_ref().unwrap();

            for subscriber in subscriptions {
                sender.send(*subscriber, message.clone());
            }
        }
    }

    pub fn broadcast_new_message(
        &self,
        set: impl AsRef<str>,
        subset: impl AsRef<str>,
        message: messages::Message,
    ) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/newMessage",
                "set": (set.as_ref()),
                "subset": (subset.as_ref()),
                "message": message
            })
            .serialize(),
        );

        if let Some(subscriptions) = subscriptions.get(set.as_ref()) {
            let locked_sender = self.global_sender.lock().unwrap();
            let sender = locked_sender.as_ref().unwrap();

            for subscriber in subscriptions {
                sender.send(*subscriber, message.clone());
            }
        }
    }

    pub fn broadcast_new_user(&self, set: impl AsRef<str>, user: User) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/updateUser",
                "set": (set.as_ref()),
                "user": user
            })
            .serialize(),
        );

        if let Some(subscriptions) = subscriptions.get(set.as_ref()) {
            let locked_sender = self.global_sender.lock().unwrap();
            let sender = locked_sender.as_ref().unwrap();

            for subscriber in subscriptions {
                sender.send(*subscriber, message.clone());
            }
        }
    }

    pub fn broadcast_update_user(&self, user: User) -> Option<()> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())
            .ok()?;

        let set_ids: Vec<String> = conn
            .exec(
                "SELECT set_id FROM memberships WHERE user_id = ?",
                (&user.uid,),
            )
            .ok()?;

        let subscriptions = self.subscriptions.read().unwrap();

        for set in set_ids {
            let message = Message::new(
                json!({
                    "event": "v1/updateUser",
                    "set": (&set),
                    "user": (user.clone())
                })
                .serialize(),
            );

            if let Some(subscriptions) = subscriptions.get(&set) {
                let locked_sender = self.global_sender.lock().unwrap();
                let sender = locked_sender.as_ref().unwrap();

                for subscriber in subscriptions {
                    sender.send(*subscriber, message.clone());
                }
            }
        }

        Some(())
    }

    pub fn broadcast_left_user(&self, set: impl AsRef<str>, uid: impl AsRef<str>) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/leftUser",
                "set": (set.as_ref()),
                "uid": (uid.as_ref())
            })
            .serialize(),
        );

        if let Some(subscriptions) = subscriptions.get(set.as_ref()) {
            let locked_sender = self.global_sender.lock().unwrap();
            let sender = locked_sender.as_ref().unwrap();

            for subscriber in subscriptions {
                sender.send(*subscriber, message.clone());
            }
        }
    }

    pub fn broadcast_joined_vc(&self, set: impl AsRef<str>, user: WrappedVoiceUser) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/userJoinedVoiceChannel",
                "set": (set.as_ref()),
                "user": user
            })
            .serialize(),
        );

        if let Some(subscriptions) = subscriptions.get(set.as_ref()) {
            let locked_sender = self.global_sender.lock().unwrap();
            let sender = locked_sender.as_ref().unwrap();

            for subscriber in subscriptions {
                sender.send(*subscriber, message.clone());
            }
        }
    }

    pub fn broadcast_left_vc(&self, set: impl AsRef<str>, uid: impl AsRef<str>) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/userLeftVoiceChannel",
                "set": (set.as_ref()),
                "uid": (uid.as_ref())
            })
            .serialize(),
        );

        if let Some(subscriptions) = subscriptions.get(set.as_ref()) {
            let locked_sender = self.global_sender.lock().unwrap();
            let sender = locked_sender.as_ref().unwrap();

            for subscriber in subscriptions {
                sender.send(*subscriber, message.clone());
            }
        }
    }
}