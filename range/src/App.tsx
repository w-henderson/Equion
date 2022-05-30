import React from "react";
import OnlineApp from "./OnlineApp";
import { open } from "@tauri-apps/api/shell";

import { API_ROUTE, WS_ROUTE } from "./api/Api";

interface AppState {
  ws: WebSocket | null,
  status: "online" | "offline" | "connecting"
}

/**
 * Manages the WebSocket connection and handles network errors.
 */
class App extends React.Component<unknown, AppState> {
  interval: number | null;
  lastPong: number | null;

  /**
   * Initializes the app.
   */
  constructor(props: unknown) {
    super(props);

    this.state = {
      ws: null,
      status: "connecting"
    };

    this.interval = null;
    this.lastPong = null;

    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.onConnectionLost = this.onConnectionLost.bind(this);
    this.onPong = this.onPong.bind(this);
  }

  /**
   * Initializes the WebSocket connection.
   */
  componentDidMount() {
    this.connect();
  }

  /**
   * Cleans up the component.
   */
  componentWillUnmount() {
    this.disconnect();
  }

  /**
   * Connects to the WebSocket server.
   */
  connect() {
    const ws = new WebSocket(WS_ROUTE);

    ws.onopen = () => this.setState({ status: "online" });
    ws.onerror = this.onConnectionLost;
    ws.onclose = this.onConnectionLost;

    this.setState({ ws });

    this.interval = window.setInterval(() => {
      if (this.lastPong !== null && this.lastPong + 5000 < new Date().getTime()) {
        this.onConnectionLost();
      }

      if (this.state.ws) {
        this.state.ws.send(JSON.stringify({ command: "v1/ping" }));
      }
    }, 5000);
  }

  /**
   * Disconnects from the WebSocket server.
   */
  disconnect() {
    if (this.state.ws) {
      this.state.ws.close();
    }

    if (this.interval) {
      window.clearInterval(this.interval);
    }
  }

  /**
   * Attempts to reconnect to the WebSocket server.
   */
  reconnect() {
    this.setState({ status: "connecting" }, () => {
      this.disconnect();
      this.connect();
    });
  }

  /**
   * Handles loss of connection.
   */
  onConnectionLost() {
    if (this.state.status === "online") window.location.reload();
    else this.setState({ status: "offline" });
  }

  /**
   * Handles the `v1/pong` event to keep track of the connection status
   */
  onPong() {
    this.lastPong = new Date().getTime();
  }

  /**
   * Renders the component.
   */
  render() {
    if (this.state.status === "online") {
      return <OnlineApp ws={this.state.ws!} onPong={this.onPong} />;
    } else if (this.state.status === "offline") {
      return (
        <div className="App offline" data-tauri-drag-region>
          <h1>You're offline!</h1>

          <p>
            Please check your internet connection, then click below to reconnect.
          </p>

          <div>
            <button onClick={this.reconnect}>Reconnect</button>
            <button onClick={() => open(API_ROUTE.replace("/api/v1", ""))}>Status Page</button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="App offline" data-tauri-drag-region>
          <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id="a">
                <stop stopColor="#fff" stopOpacity="0" offset="0%" />
                <stop stopColor="#fff" stopOpacity=".631" offset="63.146%" />
                <stop stopColor="#fff" offset="100%" />
              </linearGradient>
            </defs>
            <g fill="none" fillRule="evenodd">
              <g transform="translate(1 1)">
                <path d="M36 18c0-9.94-8.06-18-18-18" id="Oval-2" stroke="url(#a)" strokeWidth="2">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 18 18"
                    to="360 18 18"
                    dur="0.9s"
                    repeatCount="indefinite" />
                </path>
                <circle fill="#fff" cx="36" cy="18" r="1">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 18 18"
                    to="360 18 18"
                    dur="0.9s"
                    repeatCount="indefinite" />
                </circle>
              </g>
            </g>
          </svg>
        </div>
      );
    }
  }
}

export default App;