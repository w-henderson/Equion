mod harness;
pub mod mock;

use harness::TestStage;

use humphrey_json::Value;

use std::fs;
use std::net::ToSocketAddrs;
use std::path::PathBuf;

macro_rules! declare_tests {
    ($(mod $mod_name:ident { $($name:ident: $path:expr),* } )*) => {
        $(
            mod $mod_name {
                $(
                    #[test]
                    fn $name() {
                        let stages = $crate::tests::parse_stages(include_str!($path), $path);
                        $crate::tests::harness::harness(stages);
                    }
                )*
            }
        )*
    };
}

declare_tests! {
    // Auth tests
    mod auth {
        login_incorrect_password: "./testcases/auth/login_incorrect_password.json",
        login_logout_flow: "./testcases/auth/login_logout_flow.json",
        signup_empty_display_name: "./testcases/auth/signup_empty_display_name.json",
        signup_flow: "./testcases/auth/signup_flow.json",
        signup_invalid_username: "./testcases/auth/signup_invalid_username.json",
        signup_password_too_short: "./testcases/auth/signup_password_too_short.json",
        signup_username_already_exists: "./testcases/auth/signup_username_already_exists.json",
        signup_username_too_short: "./testcases/auth/signup_username_too_short.json",
        validate_invalid_token: "./testcases/auth/validate_invalid_token.json"
    }

    // User tests
    mod user {
        get_and_update_details: "./testcases/user/get_and_update_details.json"
    }

    // Message tests
    mod message {
        get_messages: "./testcases/messages/get_messages.json",
        send_message: "./testcases/messages/send_message.json",
        typing_notification: "./testcases/messages/typing_notification.json",
        update_and_delete_message: "./testcases/messages/update_and_delete_message.json"
    }

    // Set and subset tests
    mod sets {
        create_invite: "./testcases/sets/create_invite.json",
        create_set: "./testcases/sets/create_set.json",
        create_subset: "./testcases/sets/create_subset.json",
        get_invites_and_invite: "./testcases/sets/get_invites_and_invite.json",
        get_sets_and_set: "./testcases/sets/get_sets_and_set.json",
        kick_user: "./testcases/sets/kick_user.json",
        leave_and_join_set: "./testcases/sets/leave_and_join_set.json",
        revoke_invite: "./testcases/sets/revoke_invite.json",
        update_and_delete_set: "./testcases/sets/update_and_delete_set.json",
        update_and_delete_subset: "./testcases/sets/update_and_delete_subset.json"
    }

    // Event tests
    mod event {
        events_user_online_event: "./testcases/events/user_online_event.json"
    }
}

fn parse_stages(stages: &str, path: &str) -> impl Iterator<Item = TestStage> {
    let path = PathBuf::from(path);

    let path = if path.is_relative() {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("tests")
            .join(path)
            .parent()
            .unwrap()
            .to_owned()
            .canonicalize()
            .unwrap()
    } else {
        path.canonicalize().unwrap()
    };

    let stages = Value::parse(stages).unwrap();
    let stages = stages.as_array().unwrap();

    stages
        .iter()
        .map(|stage| {
            let stage_type = stage.get("type").unwrap().as_str().unwrap();

            match stage_type {
                "request" => {
                    let input = stage.get("input").unwrap();
                    let output = stage.get("output").unwrap();
                    let addr = stage
                        .get("addr")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.to_socket_addrs().ok())
                        .and_then(|mut iter| iter.next());

                    TestStage::Request {
                        input: input.clone(),
                        output: output.clone(),
                        addr,
                    }
                }

                "event" => {
                    let addr = stage
                        .get("addr")
                        .unwrap()
                        .as_str()
                        .unwrap()
                        .to_socket_addrs()
                        .unwrap()
                        .next()
                        .unwrap();

                    let data = stage.get("data").unwrap();

                    TestStage::Event {
                        data: data.clone(),
                        addr,
                    }
                }

                "import" => {
                    let import_path = stage.get("path").unwrap().as_str().unwrap().to_string();
                    let import_path_absolute = path.join(import_path).canonicalize().unwrap();
                    let import_data = fs::read_to_string(&import_path_absolute).unwrap();

                    let import_stages =
                        parse_stages(&import_data, import_path_absolute.to_str().unwrap())
                            .collect::<Vec<_>>();

                    TestStage::Import {
                        stages: import_stages,
                    }
                }

                _ => panic!("Invalid stage type: {}", stage_type),
            }
        })
        .collect::<Vec<_>>()
        .into_iter()
}
