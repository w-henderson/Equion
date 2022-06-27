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
    file: String,

    #[clap(short, long, value_parser)]
    signature: String,

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

    let payload = {
        let file_contents =
            base64::encode(std::fs::read(&args.file).expect("Could not read release file"));
        let signature_contents =
            base64::encode(std::fs::read(&args.signature).expect("Could not read signature file"));

        let file_name = PathBuf::from(&args.file)
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string();
        let signature_name = PathBuf::from(&args.signature)
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
