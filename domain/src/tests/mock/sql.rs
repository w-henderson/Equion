use crate::{
    server::{
        files::FileResponse,
        invites::Invite,
        messages::Message,
        sets::{Set, Subset},
        user::User,
    },
    util::parse_date,
};

use super::data::{minutes_in_future, now, now_u64};
use super::schema;
use super::MockTransaction;

impl<'a> MockTransaction<'a> {
    pub fn commit(self) -> Result<(), String> {
        Ok(())
    }

    pub fn exists_user_by_username(&mut self, username: &str) -> Result<bool, String> {
        Ok(self
            .database
            .users
            .iter()
            .any(|user| user.username == username))
    }

    pub fn insert_user(
        &mut self,
        id: &str,
        username: &str,
        password: &str,
        display_name: &str,
        email: &str,
        token: &str,
    ) -> Result<(), String> {
        self.database.users.push(schema::User {
            id: id.to_string(),
            username: username.to_string(),
            password: password.to_string(),
            display_name: display_name.to_string(),
            email: email.to_string(),
            token: Some(token.to_string()),
            creation_date: now(),
            image: None,
            bio: None,
        });
        Ok(())
    }

    pub fn select_id_and_password_by_username(
        &mut self,
        username: &str,
    ) -> Result<Option<(String, String)>, String> {
        Ok(self
            .database
            .users
            .iter()
            .find(|user| user.username == username)
            .map(|user| (user.id.clone(), user.password.clone())))
    }

    pub fn select_id_by_token(&mut self, token: &str) -> Result<Option<String>, String> {
        Ok(self
            .database
            .users
            .iter()
            .find(|user| user.token.as_ref().map(|t| t == token).unwrap_or(false))
            .map(|user| user.id.clone()))
    }

    pub fn select_username_by_token(&mut self, token: &str) -> Result<Option<String>, String> {
        Ok(self
            .database
            .users
            .iter()
            .find(|user| user.token.as_ref().map(|t| t == token).unwrap_or(false))
            .map(|user| user.username.clone()))
    }

    pub fn update_token_by_id(&mut self, token: &str, id: &str) -> Result<(), String> {
        let user = self
            .database
            .users
            .iter_mut()
            .find(|user| user.id == id)
            .ok_or_else(|| format!("User with id {} not found", id))?;
        user.token = Some(token.to_string());
        Ok(())
    }

    pub fn update_invalidate_token(&mut self, token: &str) -> Result<(), String> {
        let user = self
            .database
            .users
            .iter_mut()
            .find(|user| user.token.as_ref().map(|t| t == token).unwrap_or(false))
            .ok_or_else(|| format!("User with token {} not found", token))?;
        user.token = None;
        Ok(())
    }

    pub fn select_file_by_id(&mut self, id: &str) -> Result<Option<FileResponse>, String> {
        Ok(self
            .database
            .files
            .iter()
            .find(|file| file.id == id)
            .map(|file| {
                FileResponse::from_row((
                    file.id.clone(),
                    file.name.clone(),
                    file.content.clone(),
                    file.owner.clone(),
                ))
            }))
    }

    pub fn insert_file(
        &mut self,
        id: &str,
        name: &str,
        content: Vec<u8>,
        owner: &str,
    ) -> Result<(), String> {
        self.database.files.push(schema::File {
            id: id.to_string(),
            name: name.to_string(),
            content,
            owner: owner.to_string(),
        });
        Ok(())
    }

    pub fn select_username_by_subset_membership_token(
        &mut self,
        token: &str,
        subset: &str,
    ) -> Result<Option<String>, String> {
        let subset_set = self
            .database
            .subsets
            .iter()
            .find(|s| s.id == subset)
            .ok_or_else(|| format!("Subset with id {} not found", subset))?
            .set_id
            .clone();

        Ok(self
            .database
            .users
            .iter()
            .find(|user| {
                user.token == Some(token.to_string())
                    && self
                        .database
                        .memberships
                        .iter()
                        .any(|m| m.user_id == user.id && m.set_id == subset_set)
            })
            .map(|user| user.username.clone()))
    }

    pub fn select_messages_before(
        &mut self,
        subset: &str,
        before: &str,
        limit: usize,
    ) -> Result<Vec<Message>, String> {
        let before_send_time = parse_date(
            self.database
                .messages
                .iter()
                .find(|message| message.id == before)
                .ok_or_else(|| format!("Message with id {} not found", before))?
                .send_time
                .clone(),
        );

        Ok(self
            .database
            .messages
            .iter()
            .filter(|m| m.subset == subset && parse_date(m.send_time.clone()) < before_send_time)
            .rev()
            .take(limit)
            .map(|m| {
                let user = self
                    .database
                    .users
                    .iter()
                    .find(|u| u.id == m.sender)
                    .unwrap();

                let file_name = m.attachment.clone().and_then(|id| {
                    self.database
                        .files
                        .iter()
                        .find(|f| f.id == id)
                        .map(|f| f.name.clone())
                });

                Message::from_row((
                    m.id.clone(),
                    m.content.clone(),
                    m.sender.clone(),
                    user.display_name.clone(),
                    user.image.clone(),
                    m.send_time.clone(),
                    m.attachment.clone(),
                    file_name,
                ))
            })
            .collect())
    }

    pub fn select_messages(&mut self, subset: &str, limit: usize) -> Result<Vec<Message>, String> {
        Ok(self
            .database
            .messages
            .iter()
            .filter(|m| m.subset == subset)
            .rev()
            .take(limit)
            .map(|m| {
                let user = self
                    .database
                    .users
                    .iter()
                    .find(|u| u.id == m.sender)
                    .unwrap();

                let file_name = m.attachment.clone().and_then(|id| {
                    self.database
                        .files
                        .iter()
                        .find(|f| f.id == id)
                        .map(|f| f.name.clone())
                });

                Message::from_row((
                    m.id.clone(),
                    m.content.clone(),
                    m.sender.clone(),
                    user.display_name.clone(),
                    user.image.clone(),
                    m.send_time.clone(),
                    m.attachment.clone(),
                    file_name,
                ))
            })
            .collect())
    }

    pub fn select_message_by_id_and_token(
        &mut self,
        message: &str,
        token: &str,
    ) -> Result<Option<Message>, String> {
        let message = self
            .database
            .messages
            .iter()
            .find(|m| m.id == message)
            .ok_or_else(|| format!("Message with id {} not found", message))?;

        let user = self
            .database
            .users
            .iter()
            .find(|u| u.id == message.sender)
            .ok_or_else(|| format!("User with id {} not found", message.sender))?;

        let file_name = message.attachment.clone().and_then(|id| {
            self.database
                .files
                .iter()
                .find(|f| f.id == id)
                .map(|f| f.name.clone())
        });

        if user.token != Some(token.to_string()) {
            return Ok(None);
        }

        Ok(Some(Message::from_row((
            message.id.clone(),
            message.content.clone(),
            message.sender.clone(),
            user.display_name.clone(),
            user.image.clone(),
            message.send_time.clone(),
            message.attachment.clone(),
            file_name,
        ))))
    }

    #[allow(clippy::type_complexity)]
    pub fn select_subset_metadata(
        &mut self,
        token: &str,
        subset: &str,
    ) -> Result<Option<(String, String, String, Option<String>)>, String> {
        Ok(self
            .database
            .subsets
            .iter()
            .find(|s| s.id == subset)
            .and_then(|s| {
                let set = s.set_id.clone();

                let user = self
                    .database
                    .users
                    .iter()
                    .find(|u| u.token == Some(token.to_string()))?;

                if !self
                    .database
                    .memberships
                    .iter()
                    .any(|m| m.user_id == user.id && m.set_id == set)
                {
                    return None;
                }

                Some((
                    set,
                    user.id.clone(),
                    user.display_name.clone(),
                    user.image.clone(),
                ))
            }))
    }

    pub fn insert_message(
        &mut self,
        id: &str,
        content: &str,
        subset: &str,
        sender: &str,
        attachment_id: &Option<String>,
    ) -> Result<(), String> {
        self.database.messages.push(schema::Message {
            id: id.to_string(),
            content: content.to_string(),
            subset: subset.to_string(),
            sender: sender.to_string(),
            send_time: now(),
            attachment: attachment_id.clone(),
        });
        Ok(())
    }

    pub fn select_set_by_subset(&mut self, subset: &str) -> Result<Option<String>, String> {
        Ok(self
            .database
            .subsets
            .iter()
            .find(|s| s.id == subset)
            .map(|s| s.set_id.clone()))
    }

    pub fn select_message_set_and_subset(
        &mut self,
        message: &str,
    ) -> Result<Option<(String, String)>, String> {
        Ok(self
            .database
            .messages
            .iter()
            .find(|m| m.id == message)
            .and_then(|m| {
                self.database
                    .subsets
                    .iter()
                    .find(|s| s.id == m.subset)
                    .map(|s| (s.set_id.clone(), s.id.clone()))
            }))
    }

    pub fn select_sets_by_token(&mut self, token: &str) -> Result<Vec<Set>, String> {
        Ok(self
            .database
            .users
            .iter()
            .find(|u| u.token == Some(token.to_string()))
            .map(|user| {
                self.database
                    .memberships
                    .iter()
                    .filter(|m| m.user_id == user.id)
                    .flat_map(|m| {
                        self.database
                            .sets
                            .iter()
                            .find(|s| s.id == m.set_id)
                            .map(|s| {
                                Set::from_row((
                                    s.id.clone(),
                                    s.name.clone(),
                                    s.icon.clone(),
                                    m.admin,
                                ))
                            })
                    })
                    .collect()
            })
            .unwrap_or_default())
    }

    pub fn select_subsets_by_set(&mut self, set: &str) -> Result<Vec<Subset>, String> {
        Ok(self
            .database
            .subsets
            .iter()
            .filter(|s| s.set_id == set)
            .map(|s| Subset::from_row((s.id.clone(), s.name.clone())))
            .collect())
    }

    pub fn select_users_by_set(&mut self, set: &str) -> Result<Vec<User>, String> {
        Ok(self
            .database
            .memberships
            .iter()
            .filter(|m| m.set_id == set)
            .flat_map(|m| {
                self.database
                    .users
                    .iter()
                    .find(|u| u.id == m.user_id)
                    .map(|u| {
                        User::from_row((
                            u.id.clone(),
                            u.username.clone(),
                            u.display_name.clone(),
                            u.email.clone(),
                            u.image.clone(),
                            u.bio.clone(),
                        ))
                    })
            })
            .collect())
    }

    pub fn select_membership(
        &mut self,
        token: &str,
        set: &str,
    ) -> Result<Option<(bool, String)>, String> {
        Ok(self
            .database
            .users
            .iter()
            .find(|u| u.token == Some(token.to_string()))
            .and_then(|user| {
                self.database
                    .memberships
                    .iter()
                    .find(|m| m.user_id == user.id && m.set_id == set)
                    .map(|m| (m.admin, user.id.clone()))
            }))
    }

    pub fn select_set_by_id_and_token(
        &mut self,
        token: &str,
        id: &str,
    ) -> Result<Option<Set>, String> {
        Ok(self
            .database
            .users
            .iter()
            .find(|u| u.token == Some(token.to_string()))
            .and_then(|user| {
                self.database
                    .memberships
                    .iter()
                    .find(|m| m.user_id == user.id && m.set_id == id)
                    .and_then(|m| {
                        self.database.sets.iter().find(|s| s.id == id).map(|s| {
                            Set::from_row((s.id.clone(), s.name.clone(), s.icon.clone(), m.admin))
                        })
                    })
            }))
    }

    pub fn insert_set(&mut self, id: &str, name: &str, icon: &str) -> Result<(), String> {
        self.database.sets.push(schema::Set {
            id: id.to_string(),
            name: name.to_string(),
            icon: icon.to_string(),
            creation_date: now(),
        });
        Ok(())
    }

    pub fn insert_membership(
        &mut self,
        id: &str,
        user_id: &str,
        set_id: &str,
        admin: bool,
    ) -> Result<(), String> {
        self.database.memberships.push(schema::Membership {
            id: id.to_string(),
            user_id: user_id.to_string(),
            set_id: set_id.to_string(),
            admin,
            creation_date: now(),
        });
        Ok(())
    }

    pub fn insert_subset(&mut self, id: &str, name: &str, set_id: &str) -> Result<(), String> {
        self.database.subsets.push(schema::Subset {
            id: id.to_string(),
            name: name.to_string(),
            set_id: set_id.to_string(),
            creation_date: now(),
        });
        Ok(())
    }

    pub fn select_subset_metadata_for_update(
        &mut self,
        token: &str,
        subset: &str,
    ) -> Result<Option<(bool, String, String, String)>, String> {
        Ok(self
            .database
            .users
            .iter()
            .find(|u| u.token == Some(token.to_string()))
            .and_then(|user| {
                self.database
                    .memberships
                    .iter()
                    .find(|m| m.user_id == user.id && m.set_id == subset)
                    .and_then(|m| {
                        self.database
                            .subsets
                            .iter()
                            .find(|s| s.id == subset)
                            .map(|s| (m.admin, s.set_id.clone(), s.name.clone(), user.id.clone()))
                    })
            }))
    }

    pub fn delete_subset_messages(&mut self, subset: &str) -> Result<(), String> {
        self.database.messages.retain(|m| m.subset != subset);
        Ok(())
    }

    pub fn delete_subset(&mut self, subset: &str) -> Result<(), String> {
        self.database.subsets.retain(|s| s.id != subset);
        Ok(())
    }

    pub fn delete_message(&mut self, message: &str) -> Result<(), String> {
        self.database.messages.retain(|m| m.id != message);
        Ok(())
    }

    pub fn update_set_name(&mut self, name: &str, set: &str) -> Result<(), String> {
        if let Some(set) = self.database.sets.iter_mut().find(|s| s.id == set) {
            set.name = name.to_string();
        }
        Ok(())
    }

    pub fn update_set_icon(&mut self, icon: &str, set: &str) -> Result<(), String> {
        if let Some(set) = self.database.sets.iter_mut().find(|s| s.id == set) {
            set.icon = icon.to_string();
        }
        Ok(())
    }

    pub fn update_subset_name(&mut self, name: &str, subset: &str) -> Result<(), String> {
        if let Some(subset) = self.database.subsets.iter_mut().find(|s| s.id == subset) {
            subset.name = name.to_string();
        }
        Ok(())
    }

    pub fn select_user_by_token(&mut self, token: &str) -> Result<Option<User>, String> {
        Ok(self
            .database
            .users
            .iter()
            .find(|u| u.token == Some(token.to_string()))
            .map(|u| {
                User::from_row((
                    u.id.clone(),
                    u.username.clone(),
                    u.display_name.clone(),
                    u.email.clone(),
                    u.image.clone(),
                    u.bio.clone(),
                ))
            }))
    }

    pub fn select_user_by_uid(&mut self, uid: &str) -> Result<Option<User>, String> {
        Ok(self.database.users.iter().find(|u| u.id == uid).map(|u| {
            User::from_row((
                u.id.clone(),
                u.username.clone(),
                u.display_name.clone(),
                u.email.clone(),
                u.image.clone(),
                u.bio.clone(),
            ))
        }))
    }

    pub fn select_user_has_membership(&mut self, uid: &str, set: &str) -> Result<bool, String> {
        Ok(self
            .database
            .memberships
            .iter()
            .any(|m| m.user_id == uid && m.set_id == set))
    }

    pub fn delete_membership(&mut self, user_id: &str, set_id: &str) -> Result<(), String> {
        self.database
            .memberships
            .retain(|m| !(m.user_id == user_id && m.set_id != set_id));
        Ok(())
    }

    pub fn select_user_set_ids(&mut self, user_id: &str) -> Result<Vec<String>, String> {
        Ok(self
            .database
            .memberships
            .iter()
            .filter(|m| m.user_id == user_id)
            .map(|m| m.set_id.clone())
            .collect())
    }

    pub fn update_user_display_name(
        &mut self,
        display_name: &str,
        token: &str,
    ) -> Result<(), String> {
        if let Some(user) = self
            .database
            .users
            .iter_mut()
            .find(|u| u.token == Some(token.to_string()))
        {
            user.display_name = display_name.to_string();
        }
        Ok(())
    }

    pub fn update_user_email(&mut self, email: &str, token: &str) -> Result<(), String> {
        if let Some(user) = self
            .database
            .users
            .iter_mut()
            .find(|u| u.token == Some(token.to_string()))
        {
            user.email = email.to_string();
        }
        Ok(())
    }

    pub fn update_user_bio(&mut self, bio: &str, token: &str) -> Result<(), String> {
        if let Some(user) = self
            .database
            .users
            .iter_mut()
            .find(|u| u.token == Some(token.to_string()))
        {
            user.bio = Some(bio.to_string());
        }
        Ok(())
    }

    pub fn update_user_image(&mut self, image: &str, token: &str) -> Result<(), String> {
        if let Some(user) = self
            .database
            .users
            .iter_mut()
            .find(|u| u.token == Some(token.to_string()))
        {
            user.image = Some(image.to_string());
        }
        Ok(())
    }

    pub fn update_message(&mut self, message: &str, id: &str) -> Result<(), String> {
        if let Some(m) = self.database.messages.iter_mut().find(|m| m.id == id) {
            m.content = message.to_string();
        }
        Ok(())
    }

    pub fn select_invites_by_set(&mut self, set: &str) -> Result<Vec<Invite>, String> {
        Ok(self
            .database
            .sets
            .iter()
            .find(|s| s.id == set)
            .map(|s| {
                self.database
                    .invites
                    .iter()
                    .filter(|i| {
                        i.set_id == set
                            && i.expiry_date
                                .clone()
                                .map(|d| parse_date(d) > now_u64())
                                .unwrap_or(true)
                    })
                    .map(|i| {
                        Invite::from_row((
                            i.id.clone(),
                            i.set_id.clone(),
                            s.name.clone(),
                            s.icon.clone(),
                            i.code.clone(),
                            i.creation_date.clone(),
                            i.expiry_date.clone(),
                            i.uses as usize,
                        ))
                    })
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default())
    }

    pub fn select_invite_by_code(&mut self, code: &str) -> Result<Option<Invite>, String> {
        Ok(self
            .database
            .invites
            .iter()
            .find(|i| i.code == code)
            .and_then(|i| {
                self.database
                    .sets
                    .iter()
                    .find(|s| s.id == i.set_id)
                    .map(|s| {
                        Invite::from_row((
                            i.id.clone(),
                            i.set_id.clone(),
                            s.name.clone(),
                            s.icon.clone(),
                            i.code.clone(),
                            i.creation_date.clone(),
                            i.expiry_date.clone(),
                            i.uses as usize,
                        ))
                    })
            }))
    }

    pub fn insert_invite(&mut self, id: &str, set: &str, code: &str) -> Result<(), String> {
        self.database.invites.push(schema::Invite {
            id: id.to_string(),
            set_id: set.to_string(),
            code: code.to_string(),
            creation_date: now(),
            expiry_date: None,
            uses: 0,
        });
        Ok(())
    }

    pub fn insert_invite_with_duration(
        &mut self,
        id: &str,
        set: &str,
        code: &str,
        minutes: usize,
    ) -> Result<(), String> {
        self.database.invites.push(schema::Invite {
            id: id.to_string(),
            set_id: set.to_string(),
            code: code.to_string(),
            creation_date: now(),
            expiry_date: Some(minutes_in_future(minutes)),
            uses: 0,
        });
        Ok(())
    }

    pub fn delete_invite(&mut self, id: &str) -> Result<(), String> {
        self.database.invites.retain(|i| i.id != id);
        Ok(())
    }

    pub fn increment_invite_uses(&mut self, id: &str) -> Result<(), String> {
        if let Some(invite) = self.database.invites.iter_mut().find(|i| i.id == id) {
            invite.uses += 1;
        }
        Ok(())
    }

    pub fn delete_set_messages(&mut self, set: &str) -> Result<(), String> {
        let subsets: Vec<String> = self
            .database
            .subsets
            .iter()
            .filter(|s| s.set_id == set)
            .map(|s| s.id.clone())
            .collect();

        self.database
            .messages
            .retain(|m| !subsets.contains(&m.subset));

        Ok(())
    }

    pub fn delete_set_subsets(&mut self, set: &str) -> Result<(), String> {
        self.database.subsets.retain(|s| s.set_id != set);
        Ok(())
    }

    pub fn delete_set_invites(&mut self, set: &str) -> Result<(), String> {
        self.database.invites.retain(|i| i.set_id != set);
        Ok(())
    }

    pub fn delete_set_memberships(&mut self, set: &str) -> Result<(), String> {
        self.database.memberships.retain(|m| m.set_id != set);
        Ok(())
    }

    pub fn delete_set(&mut self, set: &str) -> Result<(), String> {
        self.database.sets.retain(|s| s.id != set);
        Ok(())
    }
}
