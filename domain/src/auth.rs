use crate::State;

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};

use mysql::prelude::*;

use uuid::Uuid;

pub struct AuthResponse {
    pub uid: String,
    pub token: String,
}

impl State {
    pub fn signup(
        &self,
        username: impl AsRef<str>,
        password: impl AsRef<str>,
        display_name: impl AsRef<str>,
        email: impl AsRef<str>,
    ) -> Result<AuthResponse, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        // Check if the username already exists and prevent duplicate usernames
        let exists: Option<u8> = conn
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

        conn
            .exec_drop(
                "INSERT INTO users (id, username, password, display_name, email, token) VALUES (?, ?, ?, ?, ?, ?)",
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

        Ok(AuthResponse { uid, token })
    }

    pub fn login(
        &self,
        username: impl AsRef<str>,
        password: impl AsRef<str>,
    ) -> Result<AuthResponse, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let user: Option<(String, String)> = conn
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

                conn.exec_drop("UPDATE users SET token = ? WHERE id = ?", (&token, &uid))
                    .map_err(|_| "Could not set token in database".to_string())?;

                return Ok(AuthResponse { uid, token });
            }
        }

        Err("Invalid username or password".to_string())
    }

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
}
