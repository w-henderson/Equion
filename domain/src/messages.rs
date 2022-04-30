use crate::State;

use humphrey_json::prelude::*;
use mysql::{prelude::*, Value};

use chrono::{TimeZone, Utc};
use uuid::Uuid;

pub struct Message {
    pub id: String,
    pub content: String,
    pub author_id: String,
    pub author_name: String,
    pub author_image: Option<String>,
    pub send_time: u64,
}

json_map! {
    Message,
    id => "id",
    content => "content",
    author_id => "author_id",
    author_name => "author_name",
    author_image => "author_image",
    send_time => "send_time"
}

impl State {
    pub fn messages(
        &self,
        token: impl AsRef<str>,
        subset: impl AsRef<str>,
        before: Option<String>,
        limit: Option<usize>,
    ) -> Result<Vec<Message>, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let has_appropriate_perms: Option<u8> = conn
            .exec_first(
                "SELECT 1 FROM users
                    JOIN memberships ON users.id = memberships.user_id
                    JOIN sets ON memberships.set_id = sets.id
                    JOIN subsets ON sets.id = subsets.set_id
                    WHERE users.token = ? AND subsets.id = ?",
                (token.as_ref(), subset.as_ref()),
            )
            .map_err(|_| "Could not check for invalid token".to_string())?;
        let has_appropriate_perms = has_appropriate_perms.unwrap_or(0) != 0;

        if !has_appropriate_perms {
            return Err("Insufficient permissions".to_string());
        }

        let messages: Vec<(
            String,
            String,
            String,
            String,
            Option<String>,
            Value
        )> = if let Some(before) = before { conn.exec(
            "SELECT messages.id, messages.content, messages.sender, users.display_name, users.image, messages.send_time FROM messages
                JOIN users ON messages.sender = users.id
                JOIN subsets ON messages.subset = subsets.id
                WHERE subsets.id = ? AND messages.send_time < (
                    SELECT send_time FROM messages WHERE id = ?
                )
                ORDER BY messages.send_time DESC
                LIMIT ?",
                (subset.as_ref(), before, limit.unwrap_or(25)),
        ) } else {
            conn.exec(
                "SELECT messages.id, messages.content, messages.sender, users.display_name, users.image, messages.send_time FROM messages
                    JOIN users ON messages.sender = users.id
                    JOIN subsets ON messages.subset = subsets.id
                    WHERE subsets.id = ?
                    ORDER BY messages.send_time DESC
                    LIMIT ?",
                    (subset.as_ref(), limit.unwrap_or(25)),
            )
        }.map_err(|_| "Could not get messages".to_string())?;

        let messages: Vec<Message> = messages
            .into_iter()
            .map(
                |(id, content, author_id, author_name, author_image, send_time)| Message {
                    id,
                    content,
                    author_id,
                    author_name,
                    author_image,
                    send_time: match send_time {
                        Value::Date(year, month, day, hour, min, sec, micro) => {
                            let dt = Utc
                                .ymd(year.into(), month.into(), day.into())
                                .and_hms_micro(hour.into(), min.into(), sec.into(), micro);

                            dt.timestamp().try_into().unwrap()
                        }
                        _ => panic!("Invalid date"),
                    },
                },
            )
            .collect();

        Ok(messages)
    }

    pub fn send_message(
        &self,
        token: impl AsRef<str>,
        subset: impl AsRef<str>,
        content: impl AsRef<str>,
    ) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let meta: Option<(String, String, String, Option<String>)> = conn
            .exec_first(
                "SELECT sets.id, users.id, users.display_name, users.image FROM sets
                    JOIN memberships ON sets.id = memberships.set_id
                    JOIN users ON memberships.user_id = users.id
                    JOIN subsets ON sets.id = subsets.set_id
                    WHERE users.token = ? AND subsets.id = ?",
                (token.as_ref(), subset.as_ref()),
            )
            .map_err(|_| "Could not check for invalid token".to_string())?;

        if meta.is_none() {
            return Err("Insufficient permissions".to_string());
        }

        let (set_id, user_id, author_name, author_image) = meta.unwrap();
        let new_message_id = Uuid::new_v4().to_string();

        conn.exec_drop(
            "INSERT INTO messages (id, content, subset, sender, send_time) VALUES (?, ?, ?, ?, NOW())",
            (
                &new_message_id,
                content.as_ref(),
                subset.as_ref(),
                &user_id,
            ),
        )
        .map_err(|_| "Could not send message".to_string())?;

        let send_time = Utc::now().timestamp() as u64;

        let message = Message {
            id: new_message_id,
            content: content.as_ref().to_string(),
            author_id: user_id,
            author_name,
            author_image,
            send_time,
        };

        self.broadcast_new_message(set_id, subset, message);

        Ok(())
    }
}
