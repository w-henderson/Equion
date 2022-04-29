use crate::State;

use humphrey_json::prelude::*;
use mysql::prelude::*;

pub struct User {
    pub uid: String,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub image: Option<String>,
    pub bio: Option<String>,
}

json_map! {
    User,
    uid => "uid",
    username => "username",
    display_name => "display_name",
    email => "email",
    image => "image",
    bio => "bio"
}

impl State {
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
            uid,
            username,
            display_name,
            email,
            image,
            bio,
        });

        user.ok_or_else(|| "User not found".to_string())
    }

    pub fn update_user(
        &self,
        token: impl AsRef<str>,
        display_name: Option<String>,
        email: Option<String>,
        image: Option<String>,
        bio: Option<String>,
    ) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        if let Some(display_name) = display_name {
            conn.exec_drop(
                "UPDATE users SET display_name = ? WHERE token = ?",
                (display_name, token.as_ref()),
            )
            .map_err(|_| "Could not update display name in database".to_string())?;
        }

        if let Some(email) = email {
            conn.exec_drop(
                "UPDATE users SET email = ? WHERE token = ?",
                (email, token.as_ref()),
            )
            .map_err(|_| "Could not update email in database".to_string())?;
        }

        if let Some(image) = image {
            conn.exec_drop(
                "UPDATE users SET image = ? WHERE token = ?",
                (image, token.as_ref()),
            )
            .map_err(|_| "Could not update image in database".to_string())?;
        }

        if let Some(bio) = bio {
            conn.exec_drop(
                "UPDATE users SET bio = ? WHERE token = ?",
                (bio, token.as_ref()),
            )
            .map_err(|_| "Could not update bio in database".to_string())?;
        }

        Ok(())
    }
}