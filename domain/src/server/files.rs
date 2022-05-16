use crate::State;

use mysql::prelude::*;
use uuid::Uuid;

pub struct FileResponse {
    pub id: String,
    pub name: String,
    pub content: Vec<u8>,
    pub owner: String,
}

impl State {
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
