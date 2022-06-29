use crate::db::Database;
use crate::tests::mock::{MockEventSender, MockOutgoingMessage};
use crate::voice::VoiceServer;
use crate::State;

use humphrey_json::Value;

use std::collections::{HashMap, VecDeque};
use std::net::{SocketAddr, ToSocketAddrs};
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex, RwLock};

pub enum TestStage {
    Request {
        input: Value,
        output: Value,
        addr: Option<SocketAddr>,
    },
    Event {
        data: Value,
        addr: SocketAddr,
    },
}

pub(crate) fn harness(stages: impl Iterator<Item = TestStage>) {
    let (event_tx, event_rx) = channel();

    let state = Arc::new(State {
        db: Arc::new(Database::new()),
        global_sender: Arc::new(Mutex::new(Some(MockEventSender::new(event_tx)))),
        subscriptions: Arc::new(RwLock::new(HashMap::new())),
        voice: Arc::new(VoiceServer::new()),
    });

    let mut variables: HashMap<String, String> = HashMap::new();
    let mut events: VecDeque<MockOutgoingMessage> = VecDeque::new();

    for stage in stages {
        match stage {
            TestStage::Request {
                addr,
                input: stage_input,
                output: stage_output,
            } => {
                // Add variables to input if necessary
                let input = if !variables.is_empty() {
                    let mut input_string = stage_input.serialize();

                    for (key, value) in variables.iter() {
                        input_string = input_string.replace(&format!("{{{{{}}}}}", key), value);
                    }

                    humphrey_json::from_str(input_string).unwrap()
                } else {
                    stage_input.clone()
                };

                // Run the handler to get the output
                let output = crate::ws::handler_internal(
                    Some(input.clone()),
                    addr.unwrap_or_else(|| {
                        "127.0.0.1:12345".to_socket_addrs().unwrap().next().unwrap()
                    }),
                    state.clone(),
                );

                println!("Input: {}", input.serialize());
                println!("Output: {}", output.serialize());
                println!("Expected Output: {}\n", stage_output.serialize());

                // Update variables if necessary and check for equality
                for (k, v) in equality_and_variables(&output, &stage_output) {
                    variables.insert(k, v);
                }

                // Update events if necessary
                while let Ok(message) = event_rx.try_recv() {
                    events.push_back(message);
                }
            }

            TestStage::Event {
                data: stage_data,
                addr: stage_addr,
            } => {
                if let Some(event) = events.pop_front() {
                    assert_eq!(event.addr, stage_addr);

                    let data = Value::parse(event.message.text().unwrap()).unwrap();

                    println!("Event: {}", event.message.text().unwrap());
                    println!("Expected Event: {}\n", stage_data.serialize());

                    // Update variables if necessary and check for equality
                    for (k, v) in equality_and_variables(&data, &stage_data) {
                        variables.insert(k, v);
                    }
                } else {
                    panic!("No event received");
                }
            }
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
