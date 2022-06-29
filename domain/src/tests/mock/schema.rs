use mysql::Value;

#[derive(Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub image: Option<String>,
    pub bio: Option<String>,
    pub password: String,
    pub token: Option<String>,
    pub creation_date: Value,
}

#[derive(Clone)]
pub struct Membership {
    pub id: String,
    pub user_id: String,
    pub set_id: String,
    pub admin: bool,
    pub creation_date: Value,
}

#[derive(Clone)]
pub struct Set {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub creation_date: Value,
}

#[derive(Clone)]
pub struct Invite {
    pub id: String,
    pub set_id: String,
    pub code: String,
    pub creation_date: Value,
    pub expiry_date: Option<Value>,
    pub uses: u64,
}

#[derive(Clone)]
pub struct Subset {
    pub id: String,
    pub name: String,
    pub set_id: String,
    pub creation_date: Value,
}

#[derive(Clone)]
pub struct Message {
    pub id: String,
    pub content: String,
    pub subset: String,
    pub sender: String,
    pub send_time: Value,
    pub attachment: Option<String>,
}

#[derive(Clone)]
pub struct File {
    pub id: String,
    pub name: String,
    pub content: Vec<u8>,
    pub owner: String,
}
