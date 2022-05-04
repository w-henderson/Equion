import { forage } from "@tauri-apps/tauri-forage";
import toast from "react-hot-toast";

import Subscriber from "./Subscriber";

const API_ROUTE = "http://localhost/api/v1";
const WS_ROUTE = "ws://localhost/ws";
export const DEFAULT_PROFILE_IMAGE = "https://cdn.landesa.org/wp-content/uploads/default-user-image.png";

class Api {
  uid: string | null;
  token: string | null;
  image: string | null;
  ready: boolean;
  subscriber: Subscriber;
  onMessage: (message: MessageData, set: string, subset: string) => void;
  onSubset: (subset: SubsetData, set: string) => void;

  constructor() {
    this.ready = false;
    this.uid = null;
    this.token = null;
    this.image = null;

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

  public async finishAuth(uid: string, token: string) {
    this.uid = uid;
    this.token = token;
    this.image = await this.getUserByUid(uid).then(res => res.image);
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
          return this.finishAuth(res.uid, res.token);

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
          return this.finishAuth(res.uid, res.token);

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
      });
  }

  public getSet(id: string): Promise<SetData> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/set`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        id
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          return res.set;
        } else {
          return Promise.reject(res.error);
        }
      });
  }

  public createSet(name: string, icon?: string): Promise<SetData> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/createSet`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        name,
        icon
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          return res.id;
        } else {
          return Promise.reject(res.error);
        }
      })
      .then(this.getSet.bind(this));
  }

  public joinSet(id: string): Promise<SetData> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/joinSet`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        set: id
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          return id;
        } else {
          return Promise.reject(res.error);
        }
      })
      .then(this.getSet.bind(this));
  }

  public createSubset(name: string, set: string): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/createSubset`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        set,
        name
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
            username: "",
            displayName: m.author_name,
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
    return fetch(`${API_ROUTE}/user`, {
      method: "POST",
      body: JSON.stringify({ uid })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          return {
            id: res.user.uid,
            username: res.user.username,
            displayName: res.user.display_name,
            image: res.user.image || DEFAULT_PROFILE_IMAGE,
            bio: res.user.bio
          }
        } else {
          return Promise.reject(res.error);
        }
      })
  }

  public updateUser(displayName?: string, bio?: string, image?: string): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/updateUser`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        display_name: displayName,
        bio,
        image
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          return;
        } else {
          return Promise.reject(res.error);
        }
      });
  }

  public getGreekLetter(char: string): string {
    switch (char) {
      case 'a': return 'α';
      case 'b': return 'β';
      case 'c': return 'χ';
      case 'd': return 'δ';
      case 'e': return 'ε';
      case 'f': return 'φ';
      case 'g': return 'γ';
      case 'h': return 'η';
      case 'i': return 'ι';
      case 'j': return 'ψ';
      case 'k': return 'κ';
      case 'l': return 'λ';
      case 'm': return 'μ';
      case 'n': return 'ν';
      case 'o': return 'ο';
      case 'p': return 'π';
      case 'q': return 'ς';
      case 'r': return 'ρ';
      case 's': return 'σ';
      case 't': return 'τ';
      case 'u': return 'υ';
      case 'v': return 'ν';
      case 'w': return 'ω';
      case 'x': return 'ξ';
      case 'y': return 'ψ';
      case 'z': return 'ζ';
      default: return 'λ';
    }
  }
}

export default Api;