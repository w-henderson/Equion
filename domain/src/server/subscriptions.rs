//! Provides event subscription management.

use crate::server::messages;
use crate::server::user::User;
use crate::voice::user::WrappedVoiceUser;
use crate::State;

use humphrey_ws::Message;

use humphrey_json::prelude::*;

use std::collections::hash_map::Entry;
use std::net::SocketAddr;

impl State {
    /// Subscribes the authenticated user to events for the given set.
    pub fn subscribe(
        &self,
        token: impl AsRef<str>,
        set: impl AsRef<str>,
        addr: SocketAddr,
    ) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let membership = transaction.select_membership(token.as_ref(), set.as_ref())?;

        if membership.is_none() {
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

        transaction.commit()?;

        crate::log!(
            Debug,
            "User {} subscribed to set {}",
            membership.unwrap().1,
            set.as_ref()
        );

        Ok(())
    }

    /// Unsubscribes the authenticated user from events for the given set.
    pub fn unsubscribe(
        &self,
        token: impl AsRef<str>,
        set: impl AsRef<str>,
        addr: SocketAddr,
    ) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let membership = transaction.select_membership(token.as_ref(), set.as_ref())?;

        if membership.is_none() {
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

        transaction.commit()?;

        crate::log!(
            Debug,
            "User {} unsubscribed from set {}",
            membership.unwrap().1,
            set.as_ref()
        );

        Ok(())
    }

    /// Broadcasts the "subset" event to all subscribers of the set.
    pub fn broadcast_subset(
        &self,
        set: impl AsRef<str>,
        id: impl AsRef<str>,
        name: impl AsRef<str>,
        deleted: bool,
    ) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/subset",
                "set": (set.as_ref()),
                "subset": {
                    "id": (id.as_ref()),
                    "name": (name.as_ref())
                },
                "deleted": deleted
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

    /// Broadcasts the "message" event to all subscribers of the set.
    pub fn broadcast_message(
        &self,
        set: impl AsRef<str>,
        subset: impl AsRef<str>,
        message: messages::Message,
        deleted: bool,
    ) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/message",
                "set": (set.as_ref()),
                "subset": (subset.as_ref()),
                "message": message,
                "deleted": deleted
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

    /// Broadcasts the "new user" event to all subscribers of the set.
    pub fn broadcast_new_user(&self, set: impl AsRef<str>, user: User) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/user",
                "set": (set.as_ref()),
                "user": user,
                "deleted": false
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

    /// Broadcasts the "update user" event to all subscribers of the set.
    pub fn broadcast_update_user(&self, user: User) -> Option<()> {
        let mut conn = self.db.connection().ok()?;
        let mut transaction = conn.transaction().ok()?;

        let set_ids = transaction.select_user_set_ids(&user.uid).ok()?;
        transaction.commit().ok()?;

        let subscriptions = self.subscriptions.read().unwrap();

        for set in set_ids {
            let message = Message::new(
                json!({
                    "event": "v1/user",
                    "set": (&set),
                    "user": (user.clone()),
                    "deleted": false
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

    /// Broadcasts the "update user" event when a user comes online.
    ///
    /// In the future, this will become a separate event for optimisation.
    pub fn broadcast_user_online(&self, uid: impl AsRef<str>) -> Option<()> {
        let user = self.get_user(uid).ok()?;

        self.broadcast_update_user(user)
    }

    /// Broadcasts the "update user" event when a user goes offline.
    ///
    /// In the future, this will become a separate event for optimisation.
    pub fn broadcast_user_offline(&self, uid: impl AsRef<str>) -> Option<()> {
        let user = self.get_user(uid).ok()?;

        self.broadcast_update_user(user)
    }

    /// Broadcasts the "user left" event to all subscribers of the set.
    pub fn broadcast_left_user(&self, set: impl AsRef<str>, user: User) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/user",
                "set": (set.as_ref()),
                "user": user,
                "deleted": true
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

    /// Broadcasts the "user joined voice chat" event to all subscribers of the set.
    pub fn broadcast_joined_vc(&self, set: impl AsRef<str>, user: WrappedVoiceUser) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/voice",
                "set": (set.as_ref()),
                "user": user,
                "deleted": false
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

    /// Broadcasts the "user left voice chat" event to all subscribers of the set.
    pub fn broadcast_left_vc(&self, set: impl AsRef<str>, user: WrappedVoiceUser) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/voice",
                "set": (set.as_ref()),
                "user": user,
                "deleted": true
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

    /// Broadcasts the "user typing" event.
    pub fn broadcast_typing(
        &self,
        set: impl AsRef<str>,
        subset: impl AsRef<str>,
        uid: impl AsRef<str>,
    ) {
        let subscriptions = self.subscriptions.read().unwrap();

        let message = Message::new(
            json!({
                "event": "v1/typing",
                "subset": (subset.as_ref()),
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
