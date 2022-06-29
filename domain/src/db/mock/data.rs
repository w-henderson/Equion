use std::sync::{Arc, Mutex};

use super::schema::*;
use super::{MockDatabase, MockDatabaseInner};

use mysql::Value;

pub fn init() -> MockDatabase {
    // Passwords are the same as usernames
    let users: Vec<User> = vec![
        User {
            id: "user_1".into(),
            username: "test1".into(),
            display_name: "Test User 1".into(),
            email: "test1@whenderson.dev".into(),
            image: None,
            bio: None,
            password: "$argon2id$v=19$m=16,t=2,p=1$SzVRWHZNcFNtVmdIM1BrRA$iyUXX6k0yz6gc6dn2s+TnA"
                .into(),
            token: None,
            creation_date: Value::Date(2022, 1, 1, 0, 0, 0, 0),
        },
        User {
            id: "user_2".into(),
            username: "test2".into(),
            display_name: "Test User 2".into(),
            email: "test2@whenderson.dev".into(),
            image: None,
            bio: None,
            password: "$argon2id$v=19$m=16,t=2,p=1$SzVRWHZNcFNtVmdIM1BrRA$vAS2ALgTFaI8Pu5KxATLkw"
                .into(),
            token: None,
            creation_date: Value::Date(2022, 2, 1, 0, 0, 0, 0),
        },
    ];

    let sets: Vec<Set> = vec![Set {
        id: "set_1".into(),
        name: "Set 1".into(),
        icon: "1".into(),
        creation_date: Value::Date(2022, 3, 1, 0, 0, 0, 0),
    }];

    let memberships: Vec<Membership> = vec![
        Membership {
            id: "membership_1".into(),
            user_id: "user_1".into(),
            set_id: "set_1".into(),
            admin: true,
            creation_date: Value::Date(2022, 3, 1, 0, 0, 0, 0),
        },
        Membership {
            id: "membership_2".into(),
            user_id: "user_2".into(),
            set_id: "set_1".into(),
            admin: false,
            creation_date: Value::Date(2022, 3, 2, 0, 0, 0, 0),
        },
    ];

    let invites: Vec<Invite> = Vec::new();

    let subsets: Vec<Subset> = vec![Subset {
        id: "subset_1".into(),
        name: "General".into(),
        set_id: "set_1".into(),
        creation_date: Value::Date(2022, 3, 1, 0, 0, 0, 0),
    }];

    let messages: Vec<Message> = vec![
        Message {
            id: "message_1".into(),
            content: "Hello from User 1".into(),
            subset: "subset_1".into(),
            sender: "user_1".into(),
            send_time: Value::Date(2022, 3, 1, 1, 0, 0, 0),
            attachment: None,
        },
        Message {
            id: "message_2".into(),
            content: "Hello from User 2".into(),
            subset: "subset_1".into(),
            sender: "user_2".into(),
            send_time: Value::Date(2022, 3, 1, 2, 0, 0, 0),
            attachment: None,
        },
    ];

    let files = Vec::new();

    MockDatabase {
        database: Arc::new(Mutex::new(MockDatabaseInner {
            users,
            sets,
            memberships,
            invites,
            subsets,
            messages,
            files,
        })),
    }
}

pub fn now() -> Value {
    use chrono::{Datelike, Timelike};

    let now = chrono::Utc::now();

    Value::Date(
        now.year().try_into().unwrap(),
        now.month().try_into().unwrap(),
        now.day().try_into().unwrap(),
        now.hour().try_into().unwrap(),
        now.minute().try_into().unwrap(),
        now.second().try_into().unwrap(),
        now.nanosecond(),
    )
}

pub fn now_u64() -> u64 {
    use std::time::UNIX_EPOCH;

    UNIX_EPOCH.elapsed().unwrap().as_secs()
}

pub fn minutes_in_future(minutes: usize) -> Value {
    use chrono::{Datelike, TimeZone, Timelike};
    use std::time::UNIX_EPOCH;

    let timestamp_now = UNIX_EPOCH.elapsed().unwrap().as_secs();
    let new_timestamp = timestamp_now + (minutes as u64) * 60;

    let chrono_date = chrono::Utc.timestamp(new_timestamp as i64, 0);

    Value::Date(
        chrono_date.year().try_into().unwrap(),
        chrono_date.month().try_into().unwrap(),
        chrono_date.day().try_into().unwrap(),
        chrono_date.hour().try_into().unwrap(),
        chrono_date.minute().try_into().unwrap(),
        chrono_date.second().try_into().unwrap(),
        chrono_date.nanosecond(),
    )
}
