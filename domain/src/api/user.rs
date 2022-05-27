//! Provides the high-level user-facing user management API.

use crate::api::{error_context, get_string};
use crate::State;

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

/// Parses the JSON body of the request, and if valid, returns the specified user's information.
pub fn get_user(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let uid = get_string(&json, "uid")?;

        let response = state.get_user(uid)?;

        Ok(json!({
            "success": true,
            "user": response
        }))
    })
}

/// Parses the JSON body of the request, and if valid, updates the authenticated user's details.
pub fn update_user(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let display_name = get_string(&json, "displayName").ok();
        let email = get_string(&json, "email").ok();
        let bio = get_string(&json, "bio").ok();

        state.update_user(token, display_name, email, bio)?;

        Ok(json!({
            "success": true
        }))
    })
}
