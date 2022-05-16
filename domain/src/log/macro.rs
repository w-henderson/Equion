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
