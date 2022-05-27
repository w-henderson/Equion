//! Provides logging functionality.

mod r#macro;

use once_cell::sync::Lazy;

use std::fmt::{Display, Formatter};
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::sync::Mutex;

/// The global logger instance.
pub static LOGGER: Lazy<Logger> = Lazy::new(|| Logger::new(LogLevel::Debug));

/// The log level.
#[repr(u8)]
#[derive(Clone, Copy)]
#[allow(dead_code)]
pub enum LogLevel {
    /// Only errors are logged.
    Error = 0,
    /// Errors and warnings are logged.
    Warn = 1,
    /// All basic information is logged.
    Info = 2,
    /// Detailed information for debugging is logged.
    Debug = 3,
}

/// Represents a logger.
pub struct Logger {
    /// The log level of the logger.
    level: LogLevel,
    /// The file to write logs to, as well as printing to the console.
    file: Mutex<File>,
}

impl Logger {
    /// Creates a new logger at the given level.
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

    /// Logs a message of the given level.
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
