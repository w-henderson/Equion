import WebSocket from "isomorphic-ws";
import * as uuid from "uuid";

export class EquionRpc {
  public url: string;
  public ws?: WebSocket;
  private pending: PendingRequest[] = [];
  private eventHandler?: (e: any) => void;

  constructor(url: string) {
    this.url = url;
  }

  public async init(url: string): Promise<void> {
    return new Promise(resolve => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onmessage = this.onMessage.bind(this);

      if (this.ws.readyState === WebSocket.OPEN) resolve();
    });
  }

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

  public addEventListener(handler: (e: any) => void) {
    this.eventHandler = handler;
  }

  public get(command: string, options?: EquionRpcOptions): Promise<any> {
    if (this.ws === undefined) return this.getHttp(command, options);
    else return this.getWs(command, options);
  }

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

  public getHttp(command: string, options?: EquionRpcOptions): Promise<any> {
    let body = undefined;

    if (options?.data !== undefined) {
      body = JSON.stringify(options.data);
    } else if (options?.body !== undefined) {
      body = options.body;
    }

    return fetch(`${this.url}/api/${command}`, {
      method: "POST",
      body
    }).then(res => res.json())
  }

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