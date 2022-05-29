import React from "react";
import OnlineApp from "./OnlineApp";

import { WS_ROUTE } from "./api/Api";

interface AppState {
  ws: WebSocket | null,
  status: "online" | "offline" | "connecting"
}

/**
 * Manages the WebSocket connection and handles network errors.
 */
class App extends React.Component<unknown, AppState> {
  /**
   * Initializes the app.
   */
  constructor(props: unknown) {
    super(props);

    this.state = {
      ws: null,
      status: "connecting"
    };
  }

  /**
   * Initializes the WebSocket connection.
   */
  componentDidMount() {
    const ws = new WebSocket(WS_ROUTE);

    ws.onopen = () => this.setState({ status: "online" });
    ws.onerror = () => this.setState({ status: "offline" });
    ws.onclose = () => this.setState({ status: "offline" });

    this.setState({ ws });
  }

  /**
   * Renders the component.
   */
  render() {
    if (this.state.status === "online") {
      return <OnlineApp ws={this.state.ws!} />;
    } else if (this.state.status === "offline") {
      return <div>Offline</div>;
    } else {
      return <div>Connecting...</div>;
    }
  }
}

export default App;