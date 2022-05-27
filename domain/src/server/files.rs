//! Provides the core functionality for file management.
//!
//! Currently, files are stored in the database, but in the future this will be changed to AWS S3 or Minio
//!   to perform better at scale. The API is designed so this will require minimal changes.

use crate::State;

use mysql::prelude::*;
use uuid::Uuid;

/// Represents a file response from the server.
pub struct FileResponse {
    /// The ID of the file.
    pub id: String,
    /// The name of the file.
    pub name: String,
    /// The content of the file as a string of bytes.
    pub content: Vec<u8>,
    /// The UID of the owner of the file.
    pub owner: String,
}

impl State {
    /// Gets the file with the given ID from the file store.
    pub fn get_file(&self, id: impl AsRef<str>) -> Result<FileResponse, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let file: Option<(String, String, Vec<u8>, String)> = conn
            .exec_first(
                "SELECT id, name, content, owner FROM files WHERE id = ?",
                (id.as_ref(),),
            )
            .map_err(|_| "Could not get file from database".to_string())?;

        let file = file.map(|(id, name, content, owner)| FileResponse {
            id,
            name,
            content,
            owner,
        });

        file.ok_or_else(|| "File not found".to_string())
    }

    /// Adds a file with the given name, content and owner to the file store and returns its ID.
    pub fn set_file(
        &self,
        name: impl AsRef<str>,
        content: Vec<u8>,
        owner: impl AsRef<str>,
    ) -> Result<String, String> {
        let mut conn = self
            .pool
            .get_conn()
            .map_err(|_| "Could not connect to database".to_string())?;

        let id = Uuid::new_v4().to_string();

        conn.exec_drop(
            "INSERT INTO files (id, name, content, owner) VALUES (?, ?, ?, ?)",
            (&id, name.as_ref(), &content, owner.as_ref()),
        )
        .map_err(|_| "Could not set file in database".to_string())?;

        crate::log!(
            "File created with name \"{}\" and ID \"{}\"",
            name.as_ref(),
            &id
        );

        Ok(id)
    }
}
