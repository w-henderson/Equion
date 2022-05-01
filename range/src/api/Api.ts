import { forage } from "@tauri-apps/tauri-forage";
import toast from "react-hot-toast";

import Subscriber from "./Subscriber";

const API_ROUTE = "http://localhost/api/v1";
const WS_ROUTE = "ws://localhost/ws";
export const DEFAULT_PROFILE_IMAGE = "https://cdn.landesa.org/wp-content/uploads/default-user-image.png";

class Api {
  uid: string | null;
  token: string | null;
  ready: boolean;
  subscriber: Subscriber;
  onMessage: (message: MessageData, set: string, subset: string) => void;
  onSubset: (subset: SubsetData, set: string) => void;

  constructor() {
    this.ready = false;
    this.uid = null;
    this.token = null;

    this.subscriber = new Subscriber(WS_ROUTE);
    this.onMessage = () => { };
    this.onSubset = () => { };
  }

  public async init(): Promise<boolean> {
    this.uid = await forage.getItem({ key: "uid" })();
    this.token = await forage.getItem({ key: "token" })();
    this.subscriber.onMessage = this.onMessage;
    this.subscriber.onSubset = this.onSubset;
    this.ready = true;

    return false;
  }

  public finishAuth(uid: string, token: string) {
    this.uid = uid;
    this.token = token;
  }

  public errorHandler(e: string) {
    toast.error(e);
  }

  public getUid(): string {
    return this.uid || "";
  }

  public login(username: string, password: string): Promise<void> {
    return fetch(`${API_ROUTE}/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          this.finishAuth(res.uid, res.token);

          /*forage.setItem({ key: "uid", value: res.uid })();
          forage.setItem({ key: "token", value: res.token })();*/
        } else {
          return Promise.reject(res.error);
        }
      });
  }

  public signup(username: string, password: string, displayName: string, email: string): Promise<void> {
    return fetch(`${API_ROUTE}/signup`, {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        display_name: displayName,
        email
      }),
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          this.finishAuth(res.uid, res.token);

          /*forage.setItem({ key: "uid", value: res.uid })();
          forage.setItem({ key: "token", value: res.token })();*/
        } else {
          return Promise.reject(res.error);
        }
      });
  }

  public getSets(): Promise<SetData[]> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/sets`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          return res.sets;
        } else {
          return Promise.reject(res.error);
        }
      })
  }

  public getMessages(subsetId: string, before: string | undefined = undefined, limit = 25): Promise<MessageData[]> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/messages`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        subset: subsetId,
        before,
        limit
      })
    })
      .then(res => res.json())
      .then(res => {
        let messages = res.messages;
        messages.reverse();
        res.messages = messages;
        return res;
      })
      .then(res => res.messages.map((m: any) => {
        return {
          id: m.id,
          text: m.content,
          author: {
            id: m.author_id,
            name: m.author_name,
            image: m.author_image || DEFAULT_PROFILE_IMAGE,
          },
          timestamp: m.send_time * 1000
        }
      }));
  }

  public sendMessage(subsetId: string, text: string): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/sendMessage`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        subset: subsetId,
        message: text
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          return;
        } else {
          return Promise.reject(res.error);
        }
      })
  }

  public getUserByUid(uid: string): Promise<UserData> {
    return new Promise<UserData>((resolve, reject) => {
      switch (uid) {
        case "12345678-9abc-def0-1234-56789abcdef0": return resolve({
          id: "12345678-9abc-def0-1234-56789abcdef0",
          name: "William Henderson",
          image: "https://avatars.githubusercontent.com/u/58106291"
        });

        default: return resolve({
          id: uid,
          name: "Unknown User",
          image: DEFAULT_PROFILE_IMAGE
        });
      }
    });
  }
}

export default Api;