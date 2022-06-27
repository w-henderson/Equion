use humphrey::http::{Response, StatusCode};

pub fn error_context<F>(f: F) -> Response
where
    F: Fn() -> Result<Response, (StatusCode, String)>,
{
    match f() {
        Ok(response) => response,
        Err((code, error)) => Response::new(code, error),
    }
}
