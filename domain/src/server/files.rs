//! Provides the core functionality for file management.
//!
//! Currently, files are stored in the database, but in the future this will be changed to AWS S3 or Minio
//!   to perform better at scale. The API is designed so this will require minimal changes.

use crate::db::Transaction;
use crate::State;

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

impl FileResponse {
    /// Converts a row of the database to a file response.
    pub(crate) fn from_row(row: (String, String, Vec<u8>, String)) -> Self {
        FileResponse {
            id: row.0,
            name: row.1,
            content: row.2,
            owner: row.3,
        }
    }
}

impl State {
    /// Gets the file with the given ID from the file store.
    pub fn get_file(&self, id: impl AsRef<str>) -> Result<FileResponse, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let file = transaction.select_file_by_id(id.as_ref())?;

        transaction.commit()?;

        file.ok_or_else(|| "File not found".to_string())
    }

    /// Adds a file with the given name, content and owner to the file store and returns its ID.
    pub fn set_file(
        &self,
        name: impl AsRef<str>,
        content: Vec<u8>,
        owner: impl AsRef<str>,
        transaction: &mut Transaction,
    ) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();

        transaction.insert_file(&id, name.as_ref(), content, owner.as_ref())?;

        crate::log!(
            "File created with name \"{}\" and ID \"{}\"",
            name.as_ref(),
            &id
        );

        Ok(id)
    }
}
