mod harness;
pub mod mock;

use harness::TestStage;

use humphrey_json::Value;

use std::net::ToSocketAddrs;

macro_rules! declare_tests {
    ($($name:ident: $path:expr),*) => {
        $(
            #[test]
            fn $name() {
                let stages = parse_stages(include_str!($path));
                harness::harness(stages);
            }
        )*
    };
}

declare_tests! {
    auth_login_logout_flow: "./testcases/auth/login_logout_flow.json",

    events_user_online_event: "./testcases/events/user_online_event.json"
}

fn parse_stages(stages: &str) -> impl Iterator<Item = TestStage> {
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

                _ => panic!("Invalid stage type: {}", stage_type),
            }
        })
        .collect::<Vec<_>>()
        .into_iter()
}
