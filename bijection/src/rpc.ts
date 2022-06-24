import WebSocket from "isomorphic-ws";
import * as uuid from "uuid";

/**
 * A class to handle communication with the server through HTTP and WebSocket.
 */
export class EquionRpc {
  public url: string;
  public ws?: WebSocket;
  private pending: PendingRequest[] = [];
  private eventHandler?: (e: any) => void;

  /**
   * Initializes the API to use HTTP.
   * 
   * @param url The HTTP URL to connect to.
   */
  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connects the API to the server over WebSocket.
   * 
   * This is required for receiving real-time events and using voice chat.
   * When initialized, the API will also use WebSocket where possible over HTTP to improve performance.
   * 
   * @param url The WebSocket URL to connect to.
   */
  public async connect(url: string): Promise<void> {
    return new Promise(resolve => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onclose = this.disconnect.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);

      if (this.ws.readyState === WebSocket.OPEN) resolve();
    });
  }

  /**
   * Disconnects from the server by closing the WebSocket connection.
   * 
   * Requests can still be sent, but they will be sent over HTTP, and events will no longer be received.
   */
  public disconnect() {
    if (!this.ws) return;

    if (this.ws.readyState !== WebSocket.CLOSED && this.ws.readyState !== WebSocket.CLOSING) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.close();
    }

    if (this.eventHandler) this.eventHandler({ event: "virtual/disconnect" });

    this.ws = undefined;
  }

  /**
   * Handles WebSocket messages.
   * 
   * @param e The message event from the WebSocket.
   */
  private onMessage(e: any) {
    const data = JSON.parse(e.data);

    if (data.requestId === undefined) {
      if (this.eventHandler !== undefined) this.eventHandler(data);
    } else {
      const pending = this.pending.find(p => p.id === data.requestId);

      if (pending !== undefined) {
        if (data.success === true) pending.resolve(data);
        else pending.reject(data.error);
      }
    }
  }

  /**
   * Adds an event listener for all events.
   * 
   * @param handler A function to handle events.
   */
  public addEventListener(handler: (e: any) => void) {
    this.eventHandler = handler;
  }

  /**
   * Sends the command and any data to the server.
   * 
   * This will automatically choose whether to use WebSocket or HTTP, depending on the status of the WebSocket connection
   *   as well as the command used. To avoid this behaviour, directly use either `getWs` or `getHttp`.
   * 
   * @param command The command to send to the server.
   * @param options Options for the command, including data to send.
   * @returns The response from the server.
   */
  public get(command: string, options?: EquionRpcOptions): Promise<any> {
    if (this.ws === undefined) return this.getHttp(command, options);
    else return this.getWs(command, options);
  }

  /**
   * Sends the command and any data to the server through WebSocket.
   * 
   * @param command The command to send to the server.
   * @param options Options for the command, including data to send.
   * @returns The response from the server.
   */
  public getWs(command: string, options?: EquionRpcOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.ws === undefined) return reject("No WebSocket connection");

      const requestId = uuid.v4();

      this.pending.push({
        id: requestId,
        resolve,
        reject
      });

      this.ws.send(JSON.stringify({
        command,
        requestId,
        ...options?.data === undefined ? {} : options.data
      }));
    });
  }

  /**
   * Sends the command and any data to the server through HTTP.
   * 
   * @param command The command to send to the server.
   * @param options Options for the command, including data to send.
   * @returns The response from the server.
   */
  public getHttp(command: string, options?: EquionRpcOptions): Promise<any> {
    let body = undefined;

    if (options?.data !== undefined) {
      body = JSON.stringify(options.data);
    } else if (options?.body !== undefined) {
      body = options.body;
    }

    return fetch(`${this.url}/api/${command}`, {
      method: "POST",
      headers: options?.headers,
      body
    }).then(res => res.json())
  }

  /**
   * Pings the server, triggering a pong event.
   */
  public ping() {
    if (this.ws) this.ws.send(JSON.stringify({
      command: "v1/ping"
    }));
  }
}

export type EquionRpcOptions = {
  data?: any;
  body?: any;
  headers?: any;
}

export type PendingRequest = {
  id: string;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}