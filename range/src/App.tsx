import React from "react";
import OnlineApp from "./OnlineApp";
import { open } from "@tauri-apps/api/shell";
import { forage } from "@tauri-apps/tauri-forage";

import REGIONS from "./servers.json";
import RegionSelector from "./components/RegionSelector";

import { Loading } from "./components/Svg";

export const GLOBAL_STATE = {
  rendered: false
};

interface AppState {
  region: RegionData | null,
  ws: WebSocket | null,
  status: "online" | "offline" | "connecting",
  ping: number | null,
}

/**
 * Manages the WebSocket connection and handles network errors.
 */
class App extends React.Component<unknown, AppState> {
  interval: number | null;
  lastPing: number | null;
  lastPong: number | null;

  /**
   * Initializes the app.
   */
  constructor(props: unknown) {
    super(props);

    this.state = {
      region: null,
      ws: null,
      status: "connecting",
      ping: null
    };

    this.interval = null;
    this.lastPing = null;
    this.lastPong = null;

    this.setRegion = this.setRegion.bind(this);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.onConnectionLost = this.onConnectionLost.bind(this);
    this.onPong = this.onPong.bind(this);
  }

  /**
   * Initializes the component.
   */
  async componentDidMount() {
    const regionId: string | null = await forage.getItem({ key: "region" })();

    if (regionId) {
      const regionIndex = REGIONS.findIndex(region => region.id === regionId);

      if (regionIndex !== -1) {
        this.setRegion(regionIndex);
        return;
      }
    }

    this.setState({ region: REGIONS[0] }, this.connect);
  }

  /**
   * Cleans up the component.
   */
  componentWillUnmount() {
    this.disconnect();
  }

  /**
   * Sets the region to connect to.
   */
  setRegion(region: number) {
    this.setState({ status: "connecting" }, () => {
      this.disconnect();
      this.setState({ region: REGIONS[region], ws: null }, async () => {
        await forage.setItem({ key: "region", value: this.state.region!.id })();
        GLOBAL_STATE.rendered = false;
        this.connect();
      });
    });
  }

  /**
   * Connects to the WebSocket server.
   */
  connect() {
    if (!this.state.region || this.state.ws !== null) return;

    const ws = new WebSocket(this.state.region.wsRoute);

    ws.onopen = () => this.setState({ status: "online" });
    ws.onclose = this.onConnectionLost;

    this.setState({ ws });
    this.lastPong = null;

    this.interval = window.setInterval(() => {
      if (this.lastPong !== null && this.lastPong + 10000 < new Date().getTime()) {
        this.onConnectionLost();
      }

      if (this.state.ws) {
        this.state.ws.send(JSON.stringify({ command: "v1/ping" }));
        this.lastPing = new Date().getTime();
      }
    }, 5000);
  }

  /**
   * Disconnects from the WebSocket server.
   */
  disconnect() {
    if (this.state.ws) {
      // eslint-disable-next-line react/no-direct-mutation-state
      this.state.ws.onclose = null;
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

    this.setState({ ping: this.lastPong - this.lastPing! });
  }

  /**
   * Renders the component.
   */
  render() {
    if (!this.state.region) return <></>;

    if (this.state.status === "online") {
      return (
        <OnlineApp
          ws={this.state.ws!}
          region={this.state.region}
          setRegion={this.setRegion}
          ping={this.state.ping}
          onPong={this.onPong} />
      );
    } else if (this.state.status === "offline") {
      return (
        <div className="App offline" data-tauri-drag-region>
          <h1>You're offline!</h1>

          <p>
            The Equion client couldn't connect to the server. Please check your internet connection and the status page.
          </p>

          <div>
            <button onClick={this.reconnect}>Reconnect</button>
            <button onClick={() => open(this.state.region!.apiRoute.replace("/api/v1", ""))}>Status Page</button>
          </div>

          <RegionSelector
            region={this.state.region}
            setRegion={this.setRegion} />
        </div>
      );
    } else {
      return (
        <div className="App offline" data-tauri-drag-region>
          <Loading />
        </div>
      );
    }
  }
}

export default App;