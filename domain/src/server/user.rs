//! Provides core functionality for user management.

use crate::State;

use humphrey_json::prelude::*;
use mysql::{prelude::*, TxOpts};

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

impl State {
    /// Gets the user with the given ID from the database.
    pub fn get_user(&self, uid: impl AsRef<str>) -> Result<User, String> {
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
                "SELECT id, username, display_name, email, image, bio FROM users WHERE id = ?",
                (uid.as_ref(),),
            )
            .map_err(|_| "Could not get user from database".to_string())?;

        let user = user.map(|(uid, username, display_name, email, image, bio)| User {
            online: self.voice.is_user_online(&uid),
            uid,
            username,
            display_name,
            email,
            image,
            bio,
        });

        user.ok_or_else(|| "User not found".to_string())
    }

    /// Gets the user with the given token from the database.
    pub fn get_user_by_token(&self, token: impl AsRef<str>) -> Result<User, String> {
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
            .map_err(|_| "Could not get user from database".to_string())?;

        let user = user.map(|(uid, username, display_name, email, image, bio)| User {
            online: self.voice.is_user_online(&uid),
            uid,
            username,
            display_name,
            email,
            image,
            bio,
        });

        user.ok_or_else(|| "User not found".to_string())
    }

    /// Updates the authenticated user's details.
    pub fn update_user(
        &self,
        token: impl AsRef<str>,
        display_name: Option<String>,
        email: Option<String>,
        bio: Option<String>,
    ) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        if let Some(display_name) = display_name {
            transaction
                .exec_drop(
                    "UPDATE users SET display_name = ? WHERE token = ?",
                    (display_name, token.as_ref()),
                )
                .map_err(|_| "Could not update display name in database".to_string())?;
        }

        if let Some(email) = email {
            transaction
                .exec_drop(
                    "UPDATE users SET email = ? WHERE token = ?",
                    (email, token.as_ref()),
                )
                .map_err(|_| "Could not update email in database".to_string())?;
        }

        if let Some(bio) = bio {
            transaction
                .exec_drop(
                    "UPDATE users SET bio = ? WHERE token = ?",
                    (bio, token.as_ref()),
                )
                .map_err(|_| "Could not update bio in database".to_string())?;
        }

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
            .map_err(|_| "Could not get user from database".to_string())?;

        let user = user
            .map(|(uid, username, display_name, email, image, bio)| User {
                online: self.voice.is_user_online(&uid),
                uid,
                username,
                display_name,
                email,
                image,
                bio,
            })
            .ok_or_else(|| "User not found".to_string())?;

        let uid = user.uid.clone();

        self.broadcast_update_user(user);

        crate::log!("Updated user {}", uid);

        transaction
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())?;

        Ok(())
    }

    /// Updates the authenticated user's profile picture.
    pub fn update_user_image(
        &self,
        token: impl AsRef<str>,
        name: impl AsRef<str>,
        image: Vec<u8>,
    ) -> Result<(), String> {
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
            .map_err(|_| "Could not get user from database".to_string())?;

        let user = user
            .map(|(uid, username, display_name, email, image, bio)| User {
                online: self.voice.is_user_online(&uid),
                uid,
                username,
                display_name,
                email,
                image,
                bio,
            })
            .ok_or_else(|| "User not found".to_string())?;

        let file_id = self.set_file(name, image, &user.uid, Some(&mut transaction))?;

        transaction
            .exec_drop(
                "UPDATE users SET image = ? WHERE token = ?",
                (file_id, token.as_ref()),
            )
            .map_err(|_| "Could not update image in database".to_string())?;

        let uid = user.uid.clone();

        self.broadcast_update_user(user);

        crate::log!("Updated user {} image", uid);

        transaction
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())?;

        Ok(())
    }
}
