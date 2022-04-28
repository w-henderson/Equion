mod api;
mod auth;
mod user;

use crate::api::http_api;

use humphrey::App;

use mysql::Opts;
use mysql::Pool;

use std::error::Error;
use std::sync::Arc;

static DB_URL: &str = "mysql://root:hunter2@localhost:3306/equion";

pub struct State {
    pool: Arc<Pool>,
}

fn main() -> Result<(), Box<dyn Error>> {
    let pool = Arc::new(Pool::new(Opts::from_url(DB_URL)?)?);

    let app: App<State> = App::new_with_config(32, State { pool })
        .with_route("/api/v1/signup", http_api(api::auth::signup))
        .with_route("/api/v1/login", http_api(api::auth::login))
        .with_route("/api/v1/logout", http_api(api::auth::logout))
        .with_route("/api/v1/user", http_api(api::user::get_user))
        .with_route("/api/v1/updateUser", http_api(api::user::update_user));

    app.run("0.0.0.0:80")
}
