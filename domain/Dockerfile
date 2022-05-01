FROM rust:latest

WORKDIR /usr/src/equion
COPY . .

RUN cargo build --release

EXPOSE 80

CMD ["./target/release/equion_server"]