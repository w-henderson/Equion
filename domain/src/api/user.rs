use crate::api::{error_context, get_string};
use crate::State;

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

pub fn get_user(state: Arc<State>, json: String) -> Value {
    error_context(|| {
        let json: Value = humphrey_json::from_str(&json).map_err(|_| "Invalid JSON".to_string())?;
        let uid = get_string(&json, "uid")?;

        let response = state.get_user(uid)?;

        Ok(json!({
            "success": true,
            "user": response
        }))
    })
}

pub fn update_user(state: Arc<State>, json: String) -> Value {
    error_context(|| {
        let json: Value = humphrey_json::from_str(&json).map_err(|_| "Invalid JSON".to_string())?;
        let token = get_string(&json, "token")?;
        let display_name = get_string(&json, "display_name").ok();
        let email = get_string(&json, "email").ok();
        let image = get_string(&json, "image").ok();
        let bio = get_string(&json, "bio").ok();

        state.update_user(token, display_name, email, image, bio)?;

        Ok(json!({
            "success": true
        }))
    })
}
