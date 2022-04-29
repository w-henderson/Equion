use crate::api::{error_context, get_string};
use crate::State;

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

pub fn get_sets(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;

        let response = state.get_sets(token)?;

        Ok(json!({
            "success": true,
            "sets": response
        }))
    })
}

pub fn get_set(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let id = get_string(&json, "id")?;

        let response = state.get_set(token, id)?;

        Ok(json!({
            "success": true,
            "set": response
        }))
    })
}

pub fn create_set(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let name = get_string(&json, "name")?;
        let icon = get_string(&json, "icon").ok();

        let response = state.create_set(token, name, icon)?;

        Ok(json!({
            "success": true,
            "id": response
        }))
    })
}

pub fn create_subset(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let set = get_string(&json, "set")?;
        let name = get_string(&json, "name")?;

        let response = state.create_subset(token, set, name)?;

        Ok(json!({
            "success": true,
            "id": response
        }))
    })
}

pub fn join_set(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let set = get_string(&json, "set")?;

        state.join_set(token, set)?;

        Ok(json!({
            "success": true
        }))
    })
}

pub fn leave_set(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let set = get_string(&json, "set")?;

        state.leave_set(token, set)?;

        Ok(json!({
            "success": true
        }))
    })
}
