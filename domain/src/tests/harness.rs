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
                let (stage_input, stage_output) = if !variables.is_empty() {
                    let mut input_string = stage_input.serialize();
                    let mut output_string = stage_output.serialize();

                    for (key, value) in variables.iter() {
                        input_string = input_string.replace(&format!("{{{{{}}}}}", key), value);
                        output_string = output_string.replace(&format!("{{{{{}}}}}", key), value);
                    }

                    (
                        humphrey_json::from_str(input_string).unwrap(),
                        humphrey_json::from_str(output_string).unwrap(),
                    )
                } else {
                    (stage_input, stage_output)
                };

                // Run the handler to get the output
                let output = crate::ws::handler_internal(
                    Some(stage_input.clone()),
                    addr.unwrap_or_else(|| {
                        "127.0.0.1:12345".to_socket_addrs().unwrap().next().unwrap()
                    }),
                    state.clone(),
                );

                println!("Input: {}", stage_input.serialize());
                println!("Output: {}", output.serialize());
                println!("Expected Output: {}\n", stage_output.serialize());

                // Update variables if necessary and check for equality
                for (k, v) in update_variables(&output, &stage_output).unwrap() {
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
                    for (k, v) in update_variables(&data, &stage_data).unwrap() {
                        variables.insert(k, v);
                    }
                } else {
                    panic!("No event received");
                }
            }
        }
    }
}

fn update_variables(v1: &Value, v2: &Value) -> Result<Vec<(String, String)>, String> {
    let mut variables: Vec<(String, String)> = Vec::new();

    if let Value::Object(v1_object) = v1 {
        if let Value::Object(v2_object) = v2 {
            let v1_object = v1_object.clone();
            let mut v2_object = v2_object.clone();

            if v1_object.len() != v2_object.len() {
                return Err("Objects have different lengths".to_string());
            }

            for (k, v) in v1_object {
                if let Some(index) = v2_object.iter().position(|(k2, _)| *k2 == k) {
                    let (_, v2) = v2_object.swap_remove(index);

                    variables.extend(update_variables(&v, &v2)?);
                } else {
                    return Err(format!("Resultant JSON missing key {}", k));
                }
            }

            return Ok(variables);
        }

        return Err("Resultant JSON is not an object".to_string());
    }

    if let Value::Array(v1_a) = v1 {
        if let Value::Array(v2_a) = v2 {
            let v1_a = v1_a.clone();
            let mut v2_a = v2_a.clone();

            if v1_a.len() != v2_a.len() {
                return Err("Arrays have different lengths".to_string());
            }

            for v in v1_a {
                if let Some(index) = v2_a.iter().position(|v2| update_variables(&v, v2).is_ok()) {
                    variables.extend(update_variables(&v, &v2_a.swap_remove(index))?);
                } else {
                    return Err(format!("Resultant JSON missing value {}", v.serialize()));
                }
            }

            return Ok(variables);
        }

        return Err("Resultant JSON is not an array".to_string());
    }

    if let Value::String(v1_s) = v1 {
        if let Value::String(v2_s) = v2 {
            if v2_s == "*" {
                return Ok(variables);
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

                return Ok(variables);
            }

            if v1_s != v2_s {
                return Err(format!(
                    "Resultant JSON has different value, expected {} but got {}",
                    v2_s, v1_s
                ));
            }

            return Ok(variables);
        }

        return Err("Resultant JSON is not a string".to_string());
    }

    if v1 != v2 {
        return Err(format!(
            "Resultant JSON has different value, expected {} but got {}",
            v2.serialize(),
            v1.serialize()
        ));
    }

    Ok(variables)
}
