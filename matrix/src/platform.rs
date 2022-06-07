use std::fmt::Display;

#[derive(PartialEq, Eq, Hash)]
pub enum Platform {
    Windows,
    Linux,
    MacOS,
}

impl Platform {
    pub fn does_filename_match(&self, filename: &str) -> bool {
        match self {
            Platform::Windows => {
                filename.ends_with(".exe")
                    || filename.ends_with(".msi")
                    || filename.contains("windows")
            }
            Platform::Linux => filename.ends_with(".deb") || filename.contains("linux"),
            Platform::MacOS => filename.ends_with(".dmg") || filename.contains("mac"),
        }
    }
}

impl Display for Platform {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Platform::Windows => write!(f, "Windows"),
            Platform::Linux => write!(f, "Linux"),
            Platform::MacOS => write!(f, "MacOS"),
        }
    }
}
