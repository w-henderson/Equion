//! Provides the high-level user-facing authentication API.

use crate::api::{error_context, get_string};
use crate::State;

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

/// Parses the JSON body of a request to sign up a new user, and if successful, performs the operation.
pub fn signup(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let username = get_string(&json, "username")?;
        let password = get_string(&json, "password")?;
        let display_name = get_string(&json, "displayName")?;
        let email = get_string(&json, "email")?;

        let response = state.signup(username, password, display_name, email)?;

        Ok(json!({
            "success": true,
            "uid": (response.uid),
            "token": (response.token)
        }))
    })
}

/// Parses the JSON body of a request to log in a user, and if successful, performs the operation.
pub fn login(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let username = get_string(&json, "username")?;
        let password = get_string(&json, "password")?;

        let response = state.login(username, password)?;

        Ok(json!({
            "success": true,
            "uid": (response.uid),
            "token": (response.token)
        }))
    })
}

/// Parses the JSON body of a request to log out a user, and if successful, performs the operation.
pub fn logout(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;

        state.logout(token)?;

        Ok(json!({
            "success": true
        }))
    })
}

/// Parses the JSON body of a request to validate a token, and if successful, performs the operation.
pub fn validate_token(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;

        let uid = state.validate_token(token)?;

        Ok(json!({
            "success": true,
            "uid": uid
        }))
    })
}
