use std::path::PathBuf;

use clap::Parser;

use humphrey::http::StatusCode;
use humphrey::Client;
use humphrey_json::prelude::*;

#[derive(Parser)]
#[clap(author, version, about)]
struct Args {
    #[clap(value_parser)]
    version: String,

    #[clap(short, long, value_parser, default_value = "windows")]
    platform: String,

    #[clap(short, long, value_parser)]
    file: Option<String>,

    #[clap(short, long, value_parser)]
    updater: Option<String>,

    #[clap(short, long, value_parser)]
    signature: Option<String>,

    #[clap(short = 'n', long = "notes", value_parser)]
    release_notes: Option<String>,

    #[clap(short = 'k', long, value_parser)]
    api_key: String,

    #[clap(
        short,
        long,
        value_parser,
        default_value = "https://equion.whenderson.dev/release/create"
    )]
    endpoint: String,
}

fn main() {
    let args = Args::parse();

    let directory_listing = std::fs::read_dir("./")
        .unwrap()
        .flatten()
        .collect::<Vec<_>>();

    let file_path = args
        .file
        .map(PathBuf::from)
        .or_else(|| {
            directory_listing
                .iter()
                .find(|d| match d.path().extension() {
                    Some(ext) => ext == "msi" || ext == "app" || ext == "AppImage",
                    None => false,
                })
                .map(|d| d.path())
        })
        .expect("Could not find file");

    let updater_path = args
        .updater
        .map(PathBuf::from)
        .or_else(|| {
            directory_listing
                .iter()
                .find(|d| match d.path().extension() {
                    Some(ext) => ext == "gz" || ext == "zip",
                    None => false,
                })
                .map(|d| d.path())
        })
        .expect("Could not find updater");

    let signature_path = args
        .signature
        .map(PathBuf::from)
        .or_else(|| {
            directory_listing
                .iter()
                .find(|d| d.path().extension().unwrap_or_default() == "sig")
                .map(|d| d.path())
        })
        .expect("Could not find signature");

    let payload = {
        let file_contents =
            base64::encode(std::fs::read(&file_path).expect("Could not read release file"));
        let updater_contents =
            base64::encode(std::fs::read(&updater_path).expect("Could not read updater file"));
        let signature_contents =
            base64::encode(std::fs::read(&signature_path).expect("Could not read signature file"));

        let file_name = file_path.file_name().unwrap().to_string_lossy().to_string();
        let updater_name = updater_path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string();
        let signature_name = signature_path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string();

        let release_notes = args
            .release_notes
            .unwrap_or_else(|| format!("No release notes for version {}", args.version));

        json!({
            "version": (args.version.clone()),
            "platform": (args.platform.clone()),
            "file": {
                "name": file_name,
                "data": file_contents
            },
            "updater": {
                "name": updater_name,
                "data": updater_contents
            },
            "signature": {
                "name": signature_name,
                "data": signature_contents
            },
            "releaseNotes": release_notes,
            "apiKey": (args.api_key.clone())
        })
    };

    let mut client = Client::new();

    let response = client
        .post(&args.endpoint, payload.serialize().as_bytes().to_vec())
        .expect("Invalid endpoint")
        .send()
        .expect("Failed to contact server");

    match response.status_code {
        StatusCode::Created => println!("Release {} deployed", args.version),
        StatusCode::BadRequest => println!("Invalid request"),
        StatusCode::Unauthorized => println!("Invalid API key"),
        _ => println!(
            "An unknown error occurred: {}",
            String::from_utf8_lossy(&response.body)
        ),
    }
}
