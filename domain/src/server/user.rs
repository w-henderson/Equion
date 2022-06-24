//! Provides core functionality for user management.

use crate::State;

use humphrey_json::prelude::*;

/// Represents a user response from the server.
#[derive(Clone)]
pub struct User {
    /// The ID of the user.
    pub uid: String,
    /// The username of the user.
    pub username: String,
    /// The display name of the user.
    pub display_name: String,
    /// The email address of the user.
    pub email: String,
    /// The user's profile picture, or `None` if they have not set one.
    pub image: Option<String>,
    /// The user's bio, or `None` if they have not set one.
    pub bio: Option<String>,
    /// Whether the user is currently online.
    pub online: bool,
}

json_map! {
    User,
    uid => "uid",
    username => "username",
    display_name => "displayName",
    email => "email",
    image => "image",
    bio => "bio",
    online => "online"
}

impl User {
    /// Converts a row of the database to a user.
    pub(crate) fn from_row(
        row: (
            String,
            String,
            String,
            String,
            Option<String>,
            Option<String>,
        ),
    ) -> Self {
        Self {
            uid: row.0,
            username: row.1,
            display_name: row.2,
            email: row.3,
            image: row.4,
            bio: row.5,
            online: false,
        }
    }
}

impl State {
    /// Gets the user with the given ID from the database.
    pub fn get_user(&self, uid: impl AsRef<str>) -> Result<User, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let user = transaction
            .select_user_by_uid(uid.as_ref())?
            .map(|mut user| {
                user.online = self.voice.is_user_online(&user.uid);
                user
            })
            .ok_or_else(|| "User not found".to_string());

        transaction.commit()?;

        user
    }

    /// Gets the user with the given token from the database.
    pub fn get_user_by_token(&self, token: impl AsRef<str>) -> Result<User, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let user = transaction
            .select_user_by_token(token.as_ref())?
            .map(|mut user| {
                user.online = self.voice.is_user_online(&user.uid);
                user
            })
            .ok_or_else(|| "User not found".to_string());

        transaction.commit()?;

        user
    }

    /// Updates the authenticated user's details.
    pub fn update_user(
        &self,
        token: impl AsRef<str>,
        display_name: Option<String>,
        email: Option<String>,
        bio: Option<String>,
    ) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        if let Some(display_name) = display_name {
            transaction.update_user_display_name(&display_name, token.as_ref())?;
        }

        if let Some(email) = email {
            transaction.update_user_email(&email, token.as_ref())?;
        }

        if let Some(bio) = bio {
            transaction.update_user_bio(&bio, token.as_ref())?;
        }

        let user = transaction
            .select_user_by_token(token.as_ref())?
            .map(|mut user| {
                user.online = self.voice.is_user_online(&user.uid);
                user
            })
            .ok_or_else(|| "User not found".to_string())?;

        transaction.commit()?;

        let uid = user.uid.clone();

        self.broadcast_update_user(user);

        crate::log!("Updated user {}", uid);

        Ok(())
    }

    /// Updates the authenticated user's profile picture.
    pub fn update_user_image(
        &self,
        token: impl AsRef<str>,
        name: impl AsRef<str>,
        image: Vec<u8>,
    ) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let mut user = transaction
            .select_user_by_token(token.as_ref())?
            .map(|mut user| {
                user.online = self.voice.is_user_online(&user.uid);
                user
            })
            .ok_or_else(|| "User not found".to_string())?;

        let file_id = self.set_file(name, image, &user.uid, &mut transaction)?;

        transaction.update_user_image(&file_id, token.as_ref())?;
        transaction.commit()?;

        let uid = user.uid.clone();

        user.image = Some(file_id);

        self.broadcast_update_user(user);

        crate::log!("Updated user {} image", uid);

        Ok(())
    }
}
