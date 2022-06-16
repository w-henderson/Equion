//! Provides set invitation functionality.

use crate::util::parse_date;
use crate::State;

use humphrey_json::prelude::*;
use mysql::Value;
use uuid::Uuid;

/// Represents an invite to a set.
pub struct Invite {
    /// The internally-used ID of the invite.
    pub id: String,
    /// The ID of the set that the invite is for.
    pub set_id: String,
    /// The invite code.
    pub code: String,
    /// The timestamp when the invite was created.
    pub created: u64,
    /// The timestamp when the invite expires, or `None` if it does not expire.
    pub expires: Option<u64>,
    /// How many times the invite has been used.
    pub uses: usize,
}

json_map! {
    Invite,
    id => "id",
    set_id => "set",
    code => "code",
    created => "created",
    expires => "expires",
    uses => "uses"
}

impl Invite {
    /// Parses an invite from the database.
    pub(crate) fn from_row(row: (String, String, String, Value, Option<Value>, usize)) -> Self {
        Self {
            id: row.0,
            set_id: row.1,
            code: row.2,
            created: parse_date(row.3),
            expires: row.4.map(parse_date),
            uses: row.5,
        }
    }
}

impl State {
    /// Gets the invites for a set.
    pub fn get_invites(
        &self,
        token: impl AsRef<str>,
        set: impl AsRef<str>,
    ) -> Result<Vec<Invite>, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let uid = transaction
            .select_id_by_token(token.as_ref())?
            .ok_or_else(|| "Invalid token".to_string())?;

        if !transaction.select_user_has_membership(&uid, set.as_ref())? {
            return Err("User is not a member of the set".to_string());
        }

        let invites = transaction.select_invites_by_set(set.as_ref())?;

        crate::log!(
            "User {} just retrieved invites for set {}",
            uid,
            set.as_ref()
        );

        Ok(invites)
    }

    /// Gets a specific invite.
    pub fn get_invite(&self, code: impl AsRef<str>) -> Result<Invite, String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let invite = transaction.select_invite_by_code(code.as_ref())?;

        invite.ok_or_else(|| "Invite not found".to_string())
    }

    /// Creates an invite for a set.
    pub fn create_invite(
        &self,
        token: impl AsRef<str>,
        set: impl AsRef<str>,
        duration: Option<usize>,
        code: Option<String>,
    ) -> Result<String, String> {
        if code.is_some() {
            return Err(
                "Custom invite codes require a subscription to Equion Diffontial".to_string(),
            );
        }

        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let (admin, uid) = transaction
            .select_membership(token.as_ref(), set.as_ref())?
            .ok_or_else(|| "Invalid token".to_string())?;

        if !admin {
            return Err("User is not an admin of the set".to_string());
        }

        let id = Uuid::new_v4().to_string();
        let code = Uuid::new_v4().to_string();

        if let Some(duration) = duration {
            transaction.insert_invite_with_duration(&id, set.as_ref(), &code[0..8], duration)?;
        } else {
            transaction.insert_invite(&id, set.as_ref(), &code[0..8])?;
        }

        transaction.commit()?;

        crate::log!(
            "User {} created invite {} for set {}",
            uid,
            id,
            set.as_ref()
        );

        Ok(code[0..8].to_string())
    }

    /// Revokes the specified invite.
    pub fn revoke_invite(
        &self,
        token: impl AsRef<str>,
        set: impl AsRef<str>,
        invite: impl AsRef<str>,
    ) -> Result<(), String> {
        let mut conn = self.db.connection()?;
        let mut transaction = conn.transaction()?;

        let (admin, uid) = transaction
            .select_membership(token.as_ref(), set.as_ref())?
            .ok_or_else(|| "Invalid token".to_string())?;

        if !admin {
            return Err("User is not an admin of the set".to_string());
        }

        transaction.delete_invite(invite.as_ref())?;
        transaction.commit()?;

        crate::log!(
            "User {} revoked invite {} for set {}",
            uid,
            invite.as_ref(),
            set.as_ref()
        );

        Ok(())
    }
}
