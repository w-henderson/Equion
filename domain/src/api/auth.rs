use crate::api::{error_context, get_string};
use crate::State;

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

pub fn signup(state: Arc<State>, json: String) -> Value {
    error_context(|| {
        let json: Value = humphrey_json::from_str(&json).map_err(|_| "Invalid JSON".to_string())?;
        let username = get_string(&json, "username")?;
        let password = get_string(&json, "password")?;
        let display_name = get_string(&json, "display_name")?;
        let email = get_string(&json, "email")?;

        let response = state.signup(username, password, display_name, email)?;

        Ok(json!({
            "success": true,
            "uid": (response.uid),
            "token": (response.token)
        }))
    })
}

pub fn login(state: Arc<State>, json: String) -> Value {
    error_context(|| {
        let json: Value = humphrey_json::from_str(&json).map_err(|_| "Invalid JSON".to_string())?;
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

pub fn logout(state: Arc<State>, json: String) -> Value {
    error_context(|| {
        let json: Value = humphrey_json::from_str(&json).map_err(|_| "Invalid JSON".to_string())?;
        let token = get_string(&json, "token")?;

        state.logout(token)?;

        Ok(json!({
            "success": true
        }))
    })
}
