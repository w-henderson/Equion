//! Provides the core functionality for message management.

use crate::State;

use humphrey::http::mime::MimeType;
use humphrey_json::prelude::*;

use chrono::{TimeZone, Utc};
use mysql::{prelude::*, Value};
use uuid::Uuid;

/// Represents a message response from the server.
pub struct Message {
    /// The ID of the message.
    pub id: String,
    /// The content of the message.
    pub content: String,
    /// The ID of the author.
    pub author_id: String,
    /// The name of the author.
    pub author_name: String,
    /// The optional profile picture of the author.
    pub author_image: Option<String>,
    /// The optional attachment of the message.
    pub attachment: Option<Attachment>,
    /// The time at which the message was sent.
    pub send_time: u64,
}

/// Represents an attachment response from the server.
pub struct Attachment {
    /// The ID of the file.
    pub id: String,
    /// The name of the file.
    pub name: String,
    /// The MIME type of the file.
    pub type_: String,
}

json_map! {
    Message,
    id => "id",
    content => "content",
    author_id => "authorId",
    author_name => "authorName",
    author_image => "authorImage",
    attachment => "attachment",
    send_time => "sendTime"
}

json_map! {
    Attachment,
    id => "id",
    name => "name",
    type_ => "type"
}

impl State {
    /// Gets the messages for the given subset.
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

        let user: Option<String> = conn
            .exec_first(
                "SELECT users.username FROM users
                    JOIN memberships ON users.id = memberships.user_id
                    JOIN sets ON memberships.set_id = sets.id
                    JOIN subsets ON sets.id = subsets.set_id
                    WHERE users.token = ? AND subsets.id = ?",
                (token.as_ref(), subset.as_ref()),
            )
            .map_err(|_| "Could not check for invalid token".to_string())?;

        if user.is_none() {
            return Err("Insufficient permissions".to_string());
        }

        #[allow(clippy::type_complexity)]
        let messages: Vec<(
            String,          // Message ID
            String,          // Message content
            String,          // Message author ID
            String,          // Message author name
            Option<String>,  // Message author image
            Value,           // Message send time
            Option<String>,  // Attachment ID
            Option<String>   // Attachment name
        )> = if let Some(before) = before { conn.exec(
            "SELECT messages.id, messages.content, messages.sender, users.display_name, users.image, messages.send_time, messages.attachment, files.name FROM messages
                JOIN users ON messages.sender = users.id
                JOIN subsets ON messages.subset = subsets.id
                LEFT JOIN files ON messages.attachment = files.id
                WHERE subsets.id = ? AND messages.send_time < (
                    SELECT send_time FROM messages WHERE id = ?
                )
                ORDER BY messages.send_time DESC
                LIMIT ?",
                (subset.as_ref(), before, limit.unwrap_or(25)),
        ) } else {
            conn.exec(
                "SELECT messages.id, messages.content, messages.sender, users.display_name, users.image, messages.send_time, messages.attachment, files.name FROM messages
                    JOIN users ON messages.sender = users.id
                    JOIN subsets ON messages.subset = subsets.id
                    LEFT JOIN files ON messages.attachment = files.id
                    WHERE subsets.id = ?
                    ORDER BY messages.send_time DESC
                    LIMIT ?",
                    (subset.as_ref(), limit.unwrap_or(25)),
            )
        }.map_err(|_| "Could not get messages".to_string())?;

        let messages: Vec<Message> = messages
            .into_iter()
            .map(
                |(
                    id,
                    content,
                    author_id,
                    author_name,
                    author_image,
                    send_time,
                    attachment_id,
                    attachment_name,
                )| Message {
                    id,
                    content,
                    author_id,
                    author_name,
                    author_image,
                    attachment: attachment_id.map(|id| {
                        let name = attachment_name.unwrap();
                        Attachment {
                            id,
                            name: name.clone(),
                            type_: MimeType::from_extension(name.split('.').last().unwrap_or(""))
                                .to_string(),
                        }
                    }),
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

        crate::log!(
            "User {} retrieved messages for subset {}",
            user.unwrap(),
            subset.as_ref()
        );

        Ok(messages)
    }

    /// Sends a message to the given subset.
    pub fn send_message(
        &self,
        token: impl AsRef<str>,
        subset: impl AsRef<str>,
        content: impl AsRef<str>,
        attachment: Option<(String, String)>,
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

        let attachment_id = if let Some((attachment_name, attachment_content)) = attachment.as_ref()
        {
            let attachment_content = base64::decode(attachment_content)
                .map_err(|_| "Could not decode attachment".to_string())?;

            Some(self.set_file(attachment_name, attachment_content, &user_id)?)
        } else {
            None
        };

        let new_message_id = Uuid::new_v4().to_string();

        conn.exec_drop(
            "INSERT INTO messages (id, content, subset, sender, send_time, attachment) VALUES (?, ?, ?, ?, NOW(), ?)",
            (
                &new_message_id,
                content.as_ref(),
                subset.as_ref(),
                &user_id,
                &attachment_id
            ),
        )
        .map_err(|_| "Could not send message".to_string())?;

        let send_time = Utc::now().timestamp() as u64;

        let message = Message {
            id: new_message_id.clone(),
            content: content.as_ref().to_string(),
            author_id: user_id.clone(),
            author_name,
            author_image,
            send_time,
            attachment: attachment.map(|(name, _)| Attachment {
                id: attachment_id.unwrap(),
                name: name.clone(),
                type_: MimeType::from_extension(name.split('.').last().unwrap_or("")).to_string(),
            }),
        };

        self.broadcast_new_message(set_id, subset.as_ref(), message);

        crate::log!(
            "User {} sent message with ID {} to subset {}",
            user_id,
            new_message_id,
            subset.as_ref()
        );

        Ok(())
    }
}
