//! Provides utility functions.

use chrono::{TimeZone, Utc};
use mysql::Value;

/// Returns the Greek letter corresponding to the character.
/// This is done visually and is only used for generating set icons.
pub fn get_greek_letter(ch: char) -> char {
    match ch.to_ascii_lowercase() {
        'a' => 'α',
        'b' => 'β',
        'c' => 'χ',
        'd' => 'δ',
        'e' => 'ε',
        'f' => 'φ',
        'g' => 'γ',
        'h' => 'η',
        'i' => 'ι',
        'j' => 'ψ',
        'k' => 'κ',
        'l' => 'λ',
        'm' => 'μ',
        'n' => 'ν',
        'o' => 'ο',
        'p' => 'π',
        'q' => 'ς',
        'r' => 'ρ',
        's' => 'σ',
        't' => 'τ',
        'u' => 'υ',
        'v' => 'ν',
        'w' => 'ω',
        'x' => 'ξ',
        'y' => 'ψ',
        'z' => 'ζ',
        _ => 'λ',
    }
}

/// Parses a date from a MySQL value.
pub fn parse_date(value: Value) -> u64 {
    match value {
        Value::Date(year, month, day, hour, min, sec, micro) => {
            let dt = Utc
                .ymd(year.into(), month.into(), day.into())
                .and_hms_micro(hour.into(), min.into(), sec.into(), micro);

            dt.timestamp().try_into().unwrap()
        }
        _ => panic!("Invalid date"),
    }
}
