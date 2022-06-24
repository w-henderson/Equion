//! Handles all the SQL commands necessary for Equion to function.
//!
//! (basically a pretty dodgy ORM)

#[macro_use]
mod r#macro;

use mysql::{Pool, PooledConn};

use crate::server::files::FileResponse;
use crate::server::invites::Invite;
use crate::server::messages::Message;
use crate::server::sets::{Set, Subset};
use crate::server::user::User;

/// Represents a pool of connections to the database.
pub struct Database {
    /// The pool of connections to the database.
    pool: Pool,
}

/// Represents a connection to the database.
pub struct Connection {
    /// The connection to the database.
    pub(crate) inner: PooledConn,
}

/// Represents an ongoing transaction.
pub struct Transaction<'a> {
    /// The transaction.
    pub(crate) inner: mysql::Transaction<'a>,
}

impl Database {
    /// Creates a new database instance.
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    /// Gets a new connection to the database.
    pub fn connection(&self) -> Result<Connection, String> {
        Ok(Connection {
            inner: self
                .pool
                .get_conn()
                .map_err(|_| "Could not connect to database")?,
        })
    }
}

impl Connection {
    /// Starts a new transaction.
    pub fn transaction(&mut self) -> Result<Transaction, String> {
        Ok(Transaction {
            inner: self
                .inner
                .start_transaction(mysql::TxOpts::default())
                .map_err(|_| "Could not start transaction")?,
        })
    }
}

impl<'a> Transaction<'a> {
    /// Commits the transaction.
    pub fn commit(self) -> Result<(), String> {
        self.inner
            .commit()
            .map_err(|_| "Could not commit transaction".to_string())
    }

    db! {
        exists_user_by_username(username: &str) -> bool {
            first("SELECT 1 FROM users WHERE username = ?") => |result: Option<u8>| {
                result.unwrap_or(0) != 0
            }
        }
    }

    db! {
        insert_user(
            id: &str,
            username: &str,
            password: &str,
            display_name: &str,
            email: &str,
            token: &str
        ) {
            "INSERT INTO users (id, username, password, display_name, email, token, creation_date) VALUES (?, ?, ?, ?, ?, ?, NOW())"
        }
    }

    db! {
        select_id_and_password_by_username(username: &str) -> Option<(String, String)> {
            first("SELECT id, password FROM users WHERE username = ?")
        }
    }

    db! {
        select_id_by_token(token: &str) -> Option<String> {
            first("SELECT id FROM users WHERE token = ?")
        }
    }

    db! {
        select_username_by_token(token: &str) -> Option<String> {
            first("SELECT username FROM users WHERE token = ?")
        }
    }

    db! {
        update_token_by_id(token: &str, id: &str) {
            "UPDATE users SET token = ? WHERE id = ?"
        }
    }

    db! {
        update_invalidate_token(token: &str) {
            "UPDATE users SET token = NULL WHERE token = ?"
        }
    }

    db! {
        select_file_by_id(id: &str) -> Option<FileResponse> {
            first("SELECT id, name, content, owner FROM files WHERE id = ?") => FileResponse::from_row
        }
    }

    db! {
        insert_file(id: &str, name: &str, content: Vec<u8>, owner: &str) {
            "INSERT INTO files (id, name, content, owner) VALUES (?, ?, ?, ?)"
        }
    }

    db! {
        select_username_by_subset_membership_token(token: &str, subset: &str) -> Option<String> {
            first("SELECT users.username FROM users
                JOIN memberships ON users.id = memberships.user_id
                JOIN sets ON memberships.set_id = sets.id
                JOIN subsets ON sets.id = subsets.set_id
                WHERE users.token = ? AND subsets.id = ?")
        }
    }

    db! {
        select_messages_before(subset: &str, before: &str, limit: usize) -> Vec<Message> {
            "SELECT messages.id, messages.content, messages.sender, users.display_name, users.image, messages.send_time, messages.attachment, files.name FROM messages
                JOIN users ON messages.sender = users.id
                JOIN subsets ON messages.subset = subsets.id
                LEFT JOIN files ON messages.attachment = files.id
                WHERE subsets.id = ? AND messages.send_time < (
                    SELECT send_time FROM messages WHERE id = ?
                )
                ORDER BY messages.send_time DESC
                LIMIT ?" => Message::from_row
        }
    }

    db! {
        select_messages(subset: &str, limit: usize) -> Vec<Message> {
            "SELECT messages.id, messages.content, messages.sender, users.display_name, users.image, messages.send_time, messages.attachment, files.name FROM messages
                JOIN users ON messages.sender = users.id
                JOIN subsets ON messages.subset = subsets.id
                LEFT JOIN files ON messages.attachment = files.id
                WHERE subsets.id = ?
                ORDER BY messages.send_time DESC
                LIMIT ?" => Message::from_row
        }
    }

    db! {
        select_message_by_id_and_token(message: &str, token: &str) -> Option<Message> {
            first("SELECT messages.id, messages.content, messages.sender, users.display_name, users.image, messages.send_time, messages.attachment, files.name FROM messages
                JOIN users ON messages.sender = users.id
                LEFT JOIN files ON messages.attachment = files.id
                WHERE messages.id = ? AND users.token = ?") => Message::from_row
        }
    }

    db! {
        select_subset_metadata(token: &str, subset: &str) -> Option<(String, String, String, Option<String>)> {
            first("SELECT sets.id, users.id, users.display_name, users.image FROM sets
                JOIN memberships ON sets.id = memberships.set_id
                JOIN users ON memberships.user_id = users.id
                JOIN subsets ON sets.id = subsets.set_id
                WHERE users.token = ? AND subsets.id = ?")
        }
    }

    db! {
        insert_message(id: &str, content: &str, subset: &str, sender: &str, attachment_id: &Option<String>) {
            "INSERT INTO messages (id, content, subset, sender, send_time, attachment) VALUES (?, ?, ?, ?, NOW(), ?)"
        }
    }

    db! {
        select_set_by_subset(subset: &str) -> Option<String> {
            first("SELECT set_id FROM subsets WHERE id = ?")
        }
    }

    db! {
        select_message_set_and_subset(message: &str) -> Option<(String, String)> {
            first("SELECT subsets.set_id, subsets.id FROM subsets
                JOIN messages ON subsets.id = messages.subset
                WHERE messages.id = ?")
        }
    }

    db! {
        select_sets_by_token(token: &str) -> Vec<Set> {
            "SELECT sets.id, sets.name, sets.icon, memberships.admin FROM sets
                JOIN memberships ON sets.id = memberships.set_id
                JOIN users ON memberships.user_id = users.id
                WHERE users.token = ?
                ORDER BY memberships.creation_date ASC" => Set::from_row
        }
    }

    db! {
        select_subsets_by_set(set: &str) -> Vec<Subset> {
            "SELECT id, name FROM subsets WHERE set_id = ? ORDER BY creation_date ASC" => Subset::from_row
        }
    }

    db! {
        select_users_by_set(set: &str) -> Vec<User> {
            "SELECT users.id, username, display_name, email, image, bio FROM users
                JOIN memberships ON users.id = memberships.user_id
                WHERE memberships.set_id = ?
                ORDER BY display_name ASC" => User::from_row
        }
    }

    db! {
        select_membership(token: &str, set: &str) -> Option<(bool, String)> {
            first("SELECT memberships.admin, users.id FROM memberships
                JOIN users ON users.id = memberships.user_id
                WHERE users.token = ? AND memberships.set_id = ?")
        }
    }

    db! {
        select_set_by_id_and_token(token: &str, id: &str) -> Option<Set> {
            first("SELECT sets.id, sets.name, sets.icon, memberships.admin FROM sets
                JOIN memberships ON sets.id = memberships.set_id
                JOIN users ON memberships.user_id = users.id
                WHERE users.token = ? AND sets.id = ?") => Set::from_row
        }
    }

    db! {
        insert_set(id: &str, name: &str, icon: &str) {
            "INSERT INTO sets (id, name, icon, creation_date) VALUES (?, ?, ?, NOW())"
        }
    }

    db! {
        insert_membership(id: &str, user_id: &str, set_id: &str, admin: bool) {
            "INSERT INTO memberships (id, user_id, set_id, admin, creation_date) VALUES (?, ?, ?, ?, NOW())"
        }
    }

    db! {
        insert_subset(id: &str, name: &str, set_id: &str) {
            "INSERT INTO subsets (id, name, set_id, creation_date) VALUES (?, ?, ?, NOW())"
        }
    }

    db! {
        select_subset_metadata_for_update(token: &str, subset: &str) -> Option<(bool, String, String, String)> {
            first("SELECT memberships.admin, subsets.set_id, subsets.name, users.id FROM memberships
                JOIN users ON memberships.user_id = users.id
                JOIN subsets ON memberships.set_id = subsets.set_id
                WHERE users.token = ? AND subsets.id = ?")
        }
    }

    db! {
        delete_subset_messages(subset: &str) {
            "DELETE FROM messages WHERE subset = ?"
        }
    }

    db! {
        delete_subset(subset: &str) {
            "DELETE FROM subsets WHERE id = ?"
        }
    }

    db! {
        delete_message(message: &str) {
            "DELETE FROM messages WHERE id = ?"
        }
    }

    db! {
        update_set_name(name: &str, set: &str) {
            "UPDATE sets SET name = ? WHERE id = ?"
        }
    }

    db! {
        update_set_icon(icon: &str, set: &str) {
            "UPDATE sets SET icon = ? WHERE id = ?"
        }
    }

    db! {
        update_subset_name(name: &str, subset: &str) {
            "UPDATE subsets SET name = ? WHERE id = ?"
        }
    }

    db! {
        select_user_by_token(token: &str) -> Option<User> {
            first("SELECT id, username, display_name, email, image, bio FROM users WHERE token = ?") => User::from_row
        }
    }

    db! {
        select_user_by_uid(uid: &str) -> Option<User> {
            first("SELECT id, username, display_name, email, image, bio FROM users WHERE id = ?") => User::from_row
        }
    }

    db! {
        select_user_has_membership(uid: &str, set: &str) -> bool {
            first("SELECT 1 FROM memberships WHERE user_id = ? AND set_id = ?") => |has_membership: Option<u8>| {
                has_membership.unwrap_or(0) != 0
            }
        }
    }

    db! {
        delete_membership(user_id: &str, set_id: &str) {
            "DELETE FROM memberships WHERE user_id = ? AND set_id = ?"
        }
    }

    db! {
        select_user_set_ids(user_id: &str) -> Vec<String> {
            "SELECT set_id FROM memberships WHERE user_id = ?"
        }
    }

    db! {
        update_user_display_name(display_name: &str, token: &str) {
            "UPDATE users SET display_name = ? WHERE token = ?"
        }
    }

    db! {
        update_user_email(email: &str, token: &str) {
            "UPDATE users SET email = ? WHERE token = ?"
        }
    }

    db! {
        update_user_bio(bio: &str, token: &str) {
            "UPDATE users SET bio = ? WHERE token = ?"
        }
    }

    db! {
        update_user_image(image: &str, token: &str) {
            "UPDATE users SET image = ? WHERE token = ?"
        }
    }

    db! {
        update_message(message: &str, id: &str) {
            "UPDATE messages SET content = ? WHERE id = ?"
        }
    }

    db! {
        select_invites_by_set(set: &str) -> Vec<Invite> {
            "SELECT invites.id, invites.set_id, sets.name, sets.icon, invites.code, invites.creation_date, invites.expiry_date, invites.uses FROM invites
            JOIN sets ON sets.id = invites.set_id
            WHERE set_id = ? AND (expiry_date > NOW() OR expiry_date IS NULL)" => Invite::from_row
        }
    }

    db! {
        select_invite_by_code(code: &str) -> Option<Invite> {
            first(
                "SELECT invites.id, invites.set_id, sets.name, sets.icon, invites.code, invites.creation_date, invites.expiry_date, invites.uses FROM invites
                JOIN sets ON sets.id = invites.set_id WHERE code = ?"
            ) => Invite::from_row
        }
    }

    db! {
        insert_invite(id: &str, set: &str, code: &str) {
            "INSERT INTO invites (id, set_id, code, creation_date, expiry_date) VALUES (?, ?, ?, NOW(), NULL)"
        }
    }

    db! {
        insert_invite_with_duration(id: &str, set: &str, code: &str, minutes: usize) {
            "INSERT INTO invites (id, set_id, code, creation_date, expiry_date) VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))"
        }
    }

    db! {
        delete_invite(id: &str) {
            "DELETE FROM invites WHERE id = ?"
        }
    }

    db! {
        increment_invite_uses(id: &str) {
            "UPDATE invites SET uses = uses + 1 WHERE id = ?"
        }
    }

    db! {
        delete_set_messages(set: &str) {
            "DELETE messages FROM messages JOIN subsets ON messages.subset = subsets.id WHERE subsets.set_id = ?"
        }
    }

    db! {
        delete_set_subsets(set: &str) {
            "DELETE FROM subsets WHERE set_id = ?"
        }
    }

    db! {
        delete_set_invites(set: &str) {
            "DELETE FROM invites WHERE set_id = ?"
        }
    }

    db! {
        delete_set_memberships(set: &str) {
            "DELETE FROM memberships WHERE set_id = ?"
        }
    }

    db! {
        delete_set(set: &str) {
            "DELETE FROM sets WHERE id = ?"
        }
    }
}
