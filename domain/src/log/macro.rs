//! Provides the `log!` macro to make logging easier.

/// Logs the given message at the configured level.
///
/// If no level is specified, defaults to `LogLevel::Info`.
///
/// ## Usage
/// ```
/// log!("Hello, {}!", name);
/// log!(Warn, "Hello, {}!", name);
/// log!(Info, "Hello, {}!", name);
/// log!(Debug, "Hello, {}!", name);
/// ```
#[macro_export]
macro_rules! log {
    (Error, $($arg:tt)*) => {
        $crate::log::LOGGER.log($crate::log::LogLevel::Error, format!($($arg)*));
    };
    (Warn, $($arg:tt)*) => {
        $crate::log::LOGGER.log($crate::log::LogLevel::Warn, format!($($arg)*));
    };
    (Info, $($arg:tt)*) => {
        $crate::log::LOGGER.log($crate::log::LogLevel::Info, format!($($arg)*));
    };
    (Debug, $($arg:tt)*) => {
        $crate::log::LOGGER.log($crate::log::LogLevel::Debug, format!($($arg)*));
    };
    ($($arg:tt)*) => {
        $crate::log::LOGGER.log($crate::log::LogLevel::Info, format!($($arg)*));
    };
}
