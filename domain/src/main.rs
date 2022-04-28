mod api;
mod auth;
mod sets;
mod user;
mod util;

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
        .with_route("/api/v1/updateUser", http_api(api::user::update_user))
        .with_route("/api/v1/sets", http_api(api::sets::get_sets))
        .with_route("/api/v1/set", http_api(api::sets::get_set))
        .with_route("/api/v1/createSet", http_api(api::sets::create_set))
        .with_route("/api/v1/createSubset", http_api(api::sets::create_subset))
        .with_route("/api/v1/joinSet", http_api(api::sets::join_set))
        .with_route("/api/v1/leaveSet", http_api(api::sets::leave_set));

    app.run("0.0.0.0:80")
}
