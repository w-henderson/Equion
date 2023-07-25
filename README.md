<div align="center">
  <img src="https://raw.githubusercontent.com/w-henderson/Equion/master/range/src/images/logo.png" width=150>

  <h3 align="center">Equion</h3>

  <p align="center">
    Integrate Together.<br>
    <a href="https://equion.whenderson.dev"><strong>Download Now »</strong></a> ·
    <a href="https://docs.equion.whenderson.dev">API Documentation</a>
  </p><br>

  <img src="https://img.shields.io/badge/language-rust-b07858?style=for-the-badge&logo=rust" style="margin-right:5px">
  <img src="https://img.shields.io/github/actions/workflow/status/w-henderson/Equion/server.yml?branch=master&style=for-the-badge" style="margin-right:5px"><br><br>
</div>

<hr><br>

Equion is a chat platform, similar to Discord, but built with mathematics in mind. It has built-in support for LaTeX and Markdown, high-quality low-latency voice chat and screen sharing, and is lightweight and lightning-fast thanks to Rust and Tauri.

## Services

All of Equion's custom services are built with Rust where possible and have maths-based names which are vaguely related to their functionality.

| Name | Description | Tech Stack |
| --- | --- | --- |
| [Domain](https://github.com/w-henderson/Equion/tree/master/domain) | The core Equion server, providing the API and interfacing with the database. | Rust, Humphrey, MySQL |
| [Range](https://github.com/w-henderson/Equion/tree/master/range) | The Equion front-end, providing the user interface | Rust, Tauri, React, TypeScript, Sass |
| [Bijection](https://github.com/w-henderson/Equion/tree/master/bijection) | JavaScript bindings to the Equion API, used by the front-end | TypeScript |
| [Axiom](https://github.com/w-henderson/Equion/tree/master/axiom) | The Equion website | React, Gatsby, TypeScript, Sass |
| [Matrix](https://github.com/w-henderson/Equion/tree/master/matrix) | Release manager, used to publish and retrieve Equion releases | Rust, Humphrey, JasonDB |
| Database | The Equion database | MySQL |
| Voice | The Equion voice chat server | PeerJS, WebRTC |
| Gateway | The Equion gateway | NGINX |

## Use Equion

As of July 2023, I'm no longer hosting Equion, so you'll need to host your own server:

1. Install Docker and Docker Compose on the server.
2. `git clone https://github.com/w-henderson/Equion && cd Equion`.
3. `docker-compose build`
4. `docker-compose -f docker-compose.prod.yml up -d`.

To configure the client to connect to your server, add an entry in `range/src/servers.json`.

## Screenshot

![Equion screenshot](axiom/src/images/screenshot.png)
