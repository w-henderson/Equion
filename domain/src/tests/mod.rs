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
    login_logout_flow: "./testcases/login_logout_flow.json"
}

fn parse_stages(stages: &str) -> impl Iterator<Item = TestStage> {
    let stages = Value::parse(stages).unwrap();
    let stages = stages.as_array().unwrap();

    stages
        .iter()
        .map(|stage| {
            let input = stage.get("input").unwrap();
            let output = stage.get("output").unwrap();
            let addr = stage
                .get("addr")
                .and_then(|v| v.as_str())
                .and_then(|s| s.to_socket_addrs().ok())
                .and_then(|mut iter| iter.next());

            TestStage {
                input: input.clone(),
                output: output.clone(),
                addr,
            }
        })
        .collect::<Vec<_>>()
        .into_iter()
}
