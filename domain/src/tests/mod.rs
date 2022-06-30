mod harness;
pub mod mock;

use harness::TestStage;

use humphrey_json::Value;

use std::fs;
use std::net::ToSocketAddrs;
use std::path::PathBuf;

macro_rules! declare_tests {
    ($($name:ident: $path:expr),*) => {
        $(
            #[test]
            fn $name() {
                let stages = parse_stages(include_str!($path), $path);
                harness::harness(stages);
            }
        )*
    };
}

declare_tests! {
    // Auth tests
    auth_login_logout_flow: "./testcases/auth/login_logout_flow.json",
    auth_signup_flow: "./testcases/auth/signup_flow.json",

    // User tests
    user_get_and_update_details: "./testcases/user/get_and_update_details.json",

    // Set and subset tests
    sets_create_invite: "./testcases/sets/create_invite.json",
    sets_create_set: "./testcases/sets/create_set.json",
    sets_create_subset: "./testcases/sets/create_subset.json",
    sets_get_invites_and_invite: "./testcases/sets/get_invites_and_invite.json",
    sets_get_sets_and_set: "./testcases/sets/get_sets_and_set.json",
    sets_kick_user: "./testcases/sets/kick_user.json",
    sets_leave_and_join_set: "./testcases/sets/leave_and_join_set.json",
    sets_revoke_invite: "./testcases/sets/revoke_invite.json",
    sets_update_and_delete_set: "./testcases/sets/update_and_delete_set.json",
    sets_update_and_delete_subset: "./testcases/sets/update_and_delete_subset.json",

    // Event tests
    events_user_online_event: "./testcases/events/user_online_event.json"
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
