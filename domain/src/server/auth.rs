//! Provides core authentication functionality.

use crate::State;

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};

use mysql::{prelude::*, TxOpts};

use uuid::Uuid;

/// Represents an authentication response from the server.
pub struct AuthResponse {
    /// The UID of the authenticated user.
    pub uid: String,
    /// The authentication token of the authenticated user.
    pub token: String,
}

impl State {
    /// Attempts to sign up a user with the given details.
    pub fn signup(
        &self,
        username: impl AsRef<str>,
        password: impl AsRef<str>,
        display_name: impl AsRef<str>,
        email: impl AsRef<str>,
    ) -> Result<AuthResponse, String> {
        let valid_username = username
            .as_ref()
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-');

        if username.as_ref().len() < 3 {
            return Err("Username must be at least 3 characters long.".to_string());
        }

        if !valid_username {
            return Err(
                "Username can only contain ASCII letters, numbers, underscores and hyphens."
                    .to_string(),
            );
        }

        if password.as_ref().len() < 6 {
            return Err("Password must be at least 6 characters long.".to_string());
        }

        if display_name.as_ref().trim().is_empty() {
            return Err("You must enter a display name.".to_string());
        }

        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        // Check if the username already exists and prevent duplicate usernames
        let exists: Option<u8> = transaction
            .exec_first(
                "SELECT 1 FROM users WHERE username = ?",
                (username.as_ref(),),
            )
            .map_err(|_| "Could not check for existing username".to_string())?;
        let exists = exists.unwrap_or(0) != 0;
        if exists {
            return Err("Username already exists".to_string());
        }

        // Generate a UUID for the user and hash the password
        let uid = Uuid::new_v4().to_string();
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let hash = argon2
            .hash_password(password.as_ref().as_bytes(), &salt)
            .map_err(|_| "Could not hash password".to_string())?
            .to_string();

        // Generate a token for the user
        let token = Uuid::new_v4().to_string();

        transaction
            .exec_drop(
                "INSERT INTO users (id, username, password, display_name, email, token, creation_date) VALUES (?, ?, ?, ?, ?, ?, NOW())",
                (
                    &uid,
                    username.as_ref(),
                    &hash,
                    display_name.as_ref(),
                    email.as_ref(),
                    &token
                ),
            )
            .map_err(|_| "Could not set user in database".to_string())?;

        crate::log!("User signed up with username {}", username.as_ref());

        transaction
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())?;

        Ok(AuthResponse { uid, token })
    }

    /// Attempts to sign in a user with the given details.
    pub fn login(
        &self,
        username: impl AsRef<str>,
        password: impl AsRef<str>,
    ) -> Result<AuthResponse, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let mut transaction = conn
            .start_transaction(TxOpts::default())
            .map_err(|_| "Could not start transaction".to_string())?;

        let user: Option<(String, String)> = transaction
            .exec_first(
                "SELECT id, password FROM users WHERE username = ?",
                (username.as_ref(),),
            )
            .map_err(|_| "Could not get user data from database".to_string())?;

        if let Some((uid, hash)) = user {
            let argon2 = Argon2::default();
            let password_hash = PasswordHash::new(&hash).unwrap();
            let valid = argon2
                .verify_password(password.as_ref().as_bytes(), &password_hash)
                .is_ok();

            if valid {
                let token = Uuid::new_v4().to_string();

                transaction
                    .exec_drop("UPDATE users SET token = ? WHERE id = ?", (&token, &uid))
                    .map_err(|_| "Could not set token in database".to_string())?;

                crate::log!("User logged in with username {}", username.as_ref());

                transaction
                    .commit()
                    .map_err(|_| "Could not commit transaction".to_string())?;

                return Ok(AuthResponse { uid, token });
            }
        }

        Err("Invalid username or password".to_string())
    }

    /// Logs out the user with the given token.
    pub fn logout(&self, token: impl AsRef<str>) -> Result<(), String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        conn.exec_drop(
            "UPDATE users SET token = NULL WHERE token = ?",
            (token.as_ref(),),
        )
        .map_err(|_| "Could not remove token from database".to_string())?;

        if conn.affected_rows() == 0 {
            Err("Invalid token".to_string())
        } else {
            Ok(())
        }
    }

    /// Validates the token and if valid, returns the user's ID.
    pub fn validate_token(&self, token: impl AsRef<str>) -> Result<String, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let uid: Option<String> = conn
            .exec_first("SELECT id FROM users WHERE token = ?", (token.as_ref(),))
            .map_err(|_| "Could not get user data from database".to_string())?;

        uid.ok_or_else(|| "Invalid token".to_string())
    }
}
