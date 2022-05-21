use crate::State;

use humphrey::http::{Request, Response, StatusCode};

use std::sync::Arc;

pub fn status(_: Request, state: Arc<State>) -> Response {
    let user_count = state.voice.online_users.read().unwrap().len();

    Response::empty(StatusCode::OK).with_bytes(format!(
        r#"
        <!DOCTYPE html>
        <html>
        <head>
        <title>Equion Status</title>
        <style>
        html {{ color-scheme: light dark; }}
        body {{ width: 35em; margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif; }}
        </style>
        </head>
        <body>
        <h1>Equion Status</h1>
        <p>Equion is online and all services are fully functional.</p>

        <p><em>Online users: {}</em></p>
        
        </body>
        </html>
    "#,
        user_count
    ))
}
