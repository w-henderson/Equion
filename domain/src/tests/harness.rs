use crate::db::Database;
use crate::voice::VoiceServer;
use crate::State;

use humphrey_json::Value;

use std::collections::HashMap;
use std::net::{SocketAddr, ToSocketAddrs};
use std::sync::{Arc, Mutex, RwLock};

pub struct TestStage {
    pub(crate) input: Value,
    pub(crate) output: Value,
    pub(crate) addr: Option<SocketAddr>,
}

pub(crate) fn harness(stages: impl Iterator<Item = TestStage>) {
    let state = Arc::new(State {
        db: Arc::new(Database::new()),
        global_sender: Arc::new(Mutex::new(None)),
        subscriptions: Arc::new(RwLock::new(HashMap::new())),
        voice: Arc::new(VoiceServer::new()),
    });

    let mut variables: HashMap<String, String> = HashMap::new();

    for mut stage in stages {
        if !variables.is_empty() {
            let mut input_string = stage.input.serialize();

            for (key, value) in variables.iter() {
                input_string = input_string.replace(&format!("{{{{{}}}}}", key), value);
            }

            stage.input = humphrey_json::from_str(input_string).unwrap();
        }

        let output = stage.run(state.clone());

        println!("Input: {}", stage.input.serialize());
        println!("Output: {}", output.serialize());
        println!("Expected Output: {}\n", stage.output.serialize());

        for (k, v) in equality_and_variables(&output, &stage.output) {
            variables.insert(k, v);
        }
    }
}

fn equality_and_variables(v1: &Value, v2: &Value) -> Vec<(String, String)> {
    let mut variables = Vec::new();

    if let Value::Object(v1_object) = v1 {
        if let Value::Object(v2_object) = v2 {
            let v1_object = v1_object.clone();
            let mut v2_object = v2_object.clone();

            assert_eq!(v1_object.len(), v2_object.len());

            for (k, v) in v1_object {
                if let Some(index) = v2_object.iter().position(|(k2, _)| *k2 == k) {
                    let (_, v2) = v2_object.swap_remove(index);

                    variables.extend(equality_and_variables(&v, &v2));
                } else {
                    panic!("Resultant JSON missing key {}", k)
                }
            }

            return variables;
        }

        panic!("Resultant JSON is not an object")
    }

    if let Value::Array(v1_a) = v1 {
        if let Value::Array(v2_a) = v2 {
            let v1_a = v1_a.clone();
            let mut v2_a = v2_a.clone();

            assert_eq!(v1_a.len(), v2_a.len());

            for v in v1_a {
                if let Some(index) = v2_a.iter().position(|v2| v == *v2) {
                    v2_a.swap_remove(index);
                } else {
                    panic!("Resultant JSON missing value {}", v.serialize());
                }
            }

            return variables;
        }

        panic!("Resultant JSON is not an array")
    }

    if let Value::String(v1_s) = v1 {
        if let Value::String(v2_s) = v2 {
            if v2_s == "*" {
                return variables;
            }

            if v2_s.starts_with("{{") && v2_s.ends_with("}}") {
                variables.push((
                    v2_s.strip_prefix("{{")
                        .unwrap()
                        .strip_suffix("}}")
                        .unwrap()
                        .to_string(),
                    v1_s.to_string(),
                ));

                return variables;
            }

            assert_eq!(v1_s, v2_s);

            return variables;
        }

        panic!("Resultant JSON is not a string")
    }

    assert_eq!(v1, v2);

    variables
}

impl TestStage {
    fn run(&self, state: Arc<State>) -> Value {
        crate::ws::handler_internal(
            Some(self.input.clone()),
            self.addr
                .unwrap_or_else(|| "127.0.0.1:12345".to_socket_addrs().unwrap().next().unwrap()),
            state,
        )
    }
}
