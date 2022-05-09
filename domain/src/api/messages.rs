use crate::api::{error_context, get_int, get_string};
use crate::State;

use humphrey_json::prelude::*;
use humphrey_json::Value;

use std::sync::Arc;

pub fn get_messages(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let subset = get_string(&json, "subset")?;
        let before = get_string(&json, "before").ok();
        let limit = get_int(&json, "limit").ok().map(|v| v as usize);

        let response = state.messages(token, subset, before, limit)?;

        Ok(json!({
            "success": true,
            "messages": response
        }))
    })
}

pub fn send_message(state: Arc<State>, json: Value) -> Value {
    error_context(|| {
        let token = get_string(&json, "token")?;
        let subset = get_string(&json, "subset")?;
        let content = get_string(&json, "message")?;

        let attachment_name = get_string(&json, "attachment.name").ok();
        let attachment_content = get_string(&json, "attachment.data").ok();

        let attachment =
            attachment_name.and_then(|name| attachment_content.map(|content| (name, content)));

        state.send_message(token, subset, content, attachment)?;

        Ok(json!({
            "success": true
        }))
    })
}
