mod r#macro;

use once_cell::sync::Lazy;

use std::fmt::{Display, Formatter};
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::sync::Mutex;

pub static LOGGER: Lazy<Logger> = Lazy::new(|| Logger::new(LogLevel::Debug));

#[repr(u8)]
#[derive(Clone, Copy)]
#[allow(dead_code)]
pub enum LogLevel {
    Error = 0,
    Warn = 1,
    Info = 2,
    Debug = 3,
}

pub struct Logger {
    level: LogLevel,
    file: Mutex<File>,
}

impl Logger {
    pub fn new(level: LogLevel) -> Self {
        Self {
            level,
            file: Mutex::new(
                OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open("log.txt")
                    .unwrap(),
            ),
        }
    }

    pub fn log(&self, level: LogLevel, message: String) {
        if level as u8 <= self.level as u8 {
            let mut file = self.file.lock().unwrap();
            let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
            writeln!(file, "[{}] {} {}", level, timestamp, message).unwrap();
            println!("[{}] {} {}", level, timestamp, message);
        }
    }
}

impl Display for LogLevel {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            LogLevel::Error => write!(f, "ERROR"),
            LogLevel::Warn => write!(f, "WARN "),
            LogLevel::Info => write!(f, "INFO "),
            LogLevel::Debug => write!(f, "DEBUG"),
        }
    }
}
