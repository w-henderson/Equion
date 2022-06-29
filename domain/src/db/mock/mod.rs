mod data;
mod schema;
mod sql;

use schema::*;

use std::sync::{Arc, Mutex, MutexGuard};

pub struct MockDatabaseInner {
    pub users: Vec<User>,
    pub memberships: Vec<Membership>,
    pub sets: Vec<Set>,
    pub invites: Vec<Invite>,
    pub subsets: Vec<Subset>,
    pub messages: Vec<Message>,
    pub files: Vec<File>,
}

pub struct MockDatabase {
    database: Arc<Mutex<MockDatabaseInner>>,
}

pub struct MockConnection {
    database: Arc<Mutex<MockDatabaseInner>>,
}

pub struct MockTransaction<'a> {
    database: MutexGuard<'a, MockDatabaseInner>,
    pub(crate) inner: MockTransactionInner,
}

pub struct MockTransactionInner;

impl MockDatabase {
    pub fn new() -> Self {
        data::init()
    }

    pub fn connection(&self) -> Result<MockConnection, String> {
        Ok(MockConnection {
            database: self.database.clone(),
        })
    }
}

impl MockConnection {
    pub fn transaction(&mut self) -> Result<MockTransaction, String> {
        Ok(MockTransaction {
            database: self.database.lock().unwrap(),
            inner: MockTransactionInner,
        })
    }
}

impl MockTransactionInner {
    pub fn affected_rows(&self) -> usize {
        1
    }
}
