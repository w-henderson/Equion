FROM rust:latest

RUN USER=root cargo new --bin equion

WORKDIR /equion

COPY ./Cargo.toml ./Cargo.toml
COPY ./Cargo.lock ./Cargo.lock

RUN cargo build --release
RUN rm src/*.rs

COPY ./src ./src

RUN rm ./target/release/deps/equion*
RUN cargo build --release

EXPOSE 80

CMD ["./target/release/equion_server"]