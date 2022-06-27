FROM rust:latest

RUN USER=root cargo new --bin matrix

WORKDIR /matrix

COPY ./server/Cargo.toml ./Cargo.toml
COPY ./server/Cargo.lock ./Cargo.lock

RUN cargo build --release

RUN rm src/*.rs
COPY ./server/src ./src

RUN rm ./target/release/deps/matrix*
RUN cargo build --release

EXPOSE 80
CMD ["./target/release/matrix"]