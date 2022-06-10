//! Provides the core functionality for message management.

use crate::State;

use humphrey::http::mime::MimeType;
use humphrey_json::prelude::*;

use chrono::{TimeZone, Utc};
use mysql::Value;
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

impl Message {
    /// Converts a row of the database to a message.
    #[allow(clippy::type_complexity)]
    pub(crate) fn from_row(
        row: (
            String,         // 0. Message ID
            String,         // 1. Message content
            String,         // 2. Message author ID
            String,         // 3. Message author name
            Option<String>, // 4. Message author image
            Value,          // 5. Message send time
            Option<String>, // 6. Attachment ID
            Option<String>, // 7. Attachment name
        ),
    ) -> Self {
        Message {
            id: row.0,
            content: row.1,
            author_id: row.2,
            author_name: row.3,
            author_image: row.4,
            attachment: row.6.map(|id| {
                let name = row.7.unwrap();
                Attachment {
                    id,
                    name: name.clone(),
                    type_: MimeType::from_extension(name.split('.').last().unwrap_or(""))
                        .to_string(),
                }
            }),
            send_time: match row.5 {
                Value::Date(year, month, day, hour, min, sec, micro) => {
                    let dt = Utc
                        .ymd(year.into(), month.into(), day.into())
                        .and_hms_micro(hour.into(), min.into(), sec.into(), micro);

                    dt.timestamp().try_into().unwrap()
                }
                _ => panic!("Invalid date"),
            },
        }
    }
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
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let user = transaction
            .select_username_by_subset_membership_token(token.as_ref(), subset.as_ref())?;

        if user.is_none() {
            return Err("Insufficient permissions".to_string());
        }

        let messages = if let Some(before) = before {
            transaction.select_messages_before(subset.as_ref(), &before, limit.unwrap_or(25))?
        } else {
            transaction.select_messages(subset.as_ref(), limit.unwrap_or(25))?
        };

        transaction.commit()?;

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
        attachment_name: Option<String>,
        attachment_content: Option<String>,
    ) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let meta = transaction.select_subset_metadata(token.as_ref(), subset.as_ref())?;

        if meta.is_none() {
            return Err("Insufficient permissions".to_string());
        }

        let (set_id, user_id, author_name, author_image) = meta.unwrap();

        let attachment = if let Some(attachment_name) = attachment_name {
            Some((
                attachment_name,
                attachment_content.ok_or_else(|| "No attachment content provided".to_string())?,
            ))
        } else {
            None
        };

        let attachment_id = if let Some((attachment_name, attachment_content)) = attachment.as_ref()
        {
            let attachment_content = base64::decode(attachment_content)
                .map_err(|_| "Could not decode attachment".to_string())?;

            Some(self.set_file(
                attachment_name,
                attachment_content,
                &user_id,
                &mut transaction,
            )?)
        } else {
            None
        };

        let new_message_id = Uuid::new_v4().to_string();

        transaction.insert_message(
            &new_message_id,
            content.as_ref(),
            subset.as_ref(),
            &user_id,
            &attachment_id,
        )?;

        transaction.commit()?;

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

        self.broadcast_message(set_id, subset.as_ref(), message, false);

        crate::log!(
            "User {} sent message with ID {} to subset {}",
            user_id,
            new_message_id,
            subset.as_ref()
        );

        Ok(())
    }

    /// Updates or deletes the given message.
    pub fn update_message(
        &self,
        token: impl AsRef<str>,
        message_id: impl AsRef<str>,
        content: Option<String>,
        delete: Option<bool>,
    ) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let message =
            transaction.select_message_by_id_and_token(message_id.as_ref(), token.as_ref())?;

        if message.is_none() {
            return Err("Insufficient permissions".to_string());
        }

        let mut message = message.unwrap();
        let user_id = message.author_id.clone();

        let (set, subset) = transaction
            .select_message_set_and_subset(&message.id)?
            .ok_or_else(|| "Message not found".to_string())?;

        if delete == Some(true) {
            transaction.delete_message(&message.id)?;
            transaction.commit()?;

            self.broadcast_message(set, subset, message, true);

            crate::log!("User {} deleted message {}", user_id, message_id.as_ref());
        } else if let Some(content) = content {
            transaction.update_message(&content, message_id.as_ref())?;
            transaction.commit()?;

            message.content = content;

            self.broadcast_message(set, subset, message, false);

            crate::log!("User {} updated subset {}", user_id, message_id.as_ref());
        }

        Ok(())
    }

    /// Updates the user's typing status.
    pub fn set_typing(
        &self,
        token: impl AsRef<str>,
        subset: impl AsRef<str>,
    ) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let uid = transaction.select_id_by_token(token.as_ref())?;
        let set = transaction.select_set_by_subset(subset.as_ref())?;

        transaction.commit()?;

        if let Some((uid, set)) = uid.and_then(|u| set.map(|s| (u, s))) {
            self.broadcast_typing(set, subset, uid);

            Ok(())
        } else {
            Err("Insufficient permissions or invalid subset".to_string())
        }
    }
}
