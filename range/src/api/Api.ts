import { forage } from "@tauri-apps/tauri-forage";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import toast from "react-hot-toast";

import Subscriber from "./Subscriber";
import Notifier from "./Notifier";
import Voice from "./Voice";

const API_ROUTE = process.env.REACT_APP_EQUION_API_ROUTE || "http://localhost/api/v1";
const WS_ROUTE = process.env.REACT_APP_EQUION_WS_ROUTE || "ws://localhost/ws";

export const DEFAULT_PROFILE_IMAGE = "https://cdn.landesa.org/wp-content/uploads/default-user-image.png";

class Api {
  uid: string | null;
  token: string | null;
  image: string | null | undefined;
  ready: boolean;

  minimisedToTray: boolean;
  trayIcon: "default" | "notification";

  subscriber: Subscriber;
  notifier: Notifier;
  voice: Voice;

  onShow: () => void;
  onMessage: (message: MessageData, set: string, subset: string) => void;
  onSubset: (subset: SubsetData, set: string) => void;
  onUpdateUser: (set: string, user: UserData) => void;
  onLeftUser: (set: string, uid: string) => void;
  onUserJoinedVoiceChannel: (set: string, user: VoiceUserData) => void;
  onUserLeftVoiceChannel: (set: string, uid: string) => void;

  constructor() {
    this.ready = false;
    this.uid = null;
    this.token = null;
    this.image = null;
    this.minimisedToTray = false;
    this.trayIcon = "default";

    this.subscriber = new Subscriber(WS_ROUTE);
    this.voice = new Voice(this.subscriber.ws);
    this.notifier = new Notifier(this.getFileURL.bind(this), this.doesMessagePingMe.bind(this));

    this.onShow = () => { };
    this.onMessage = () => { };
    this.onSubset = () => { };
    this.onUpdateUser = () => { };
    this.onLeftUser = () => { };
    this.onUserJoinedVoiceChannel = () => { };
    this.onUserLeftVoiceChannel = () => { };
  }

  public async init(): Promise<boolean> {
    this.uid = await forage.getItem({ key: "uid" })();
    this.token = await forage.getItem({ key: "token" })();

    this.subscriber.onMessage = this.onMessage;
    this.subscriber.onSubset = this.onSubset;

    this.subscriber.onUserJoinedVoiceChannel = (set: string, user: VoiceUserData) => {
      if (this.uid === user.user.uid) {
        this.voice.currentChannel = set;
      }

      this.onUserJoinedVoiceChannel(set, user);
    }

    this.subscriber.onUserLeftVoiceChannel = (set: string, uid: string) => {
      if (this.uid === uid) {
        this.voice.currentChannel = null;
      }

      this.onUserLeftVoiceChannel(set, uid);
    }

    this.subscriber.onUpdateUser = (set, user) => {
      if (user.uid !== this.uid) this.onUpdateUser(set, user);
    };

    this.subscriber.onLeftUser = (set, uid) => {
      if (uid !== this.uid) this.onLeftUser(set, uid);
    }

    listen("show", () => {
      this.minimisedToTray = false;
      this.onShow();
    });

    invoke("set_notification_icon", { icon: "default" });

    this.ready = true;

    // Whether the user is already authenticated.
    return false;
  }

  public async finishAuth(uid: string, token: string) {
    this.uid = uid;
    this.token = token;
    this.image = await this.getUserByUid(uid).then(res => res.image);

    await this.voice.init(token);
  }

  public errorHandler(e: string) {
    toast.error(e);
  }

  public getUid(): string {
    return this.uid || "";
  }

  public minimiseToTray() {
    this.minimisedToTray = true;
    appWindow.hide();
  }

  public setTrayIcon(icon: "default" | "notification") {
    if (this.trayIcon !== icon) {
      this.trayIcon = icon;
      invoke("set_notification_icon", { icon });
    }
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
        displayName,
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

  public leaveSet(id: string): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/leaveSet`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        set: id
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
        let hasAttachment = m.attachment !== null;

        let result: MessageData = {
          id: m.id,
          text: m.content,
          author: {
            uid: m.authorId,
            username: "",
            displayName: m.authorName,
            image: m.authorImage,
          },
          attachment: hasAttachment ? {
            id: m.attachment.id,
            name: m.attachment.name,
            type: m.attachment.type
          } : null,
          timestamp: m.sendTime * 1000
        }

        return result;
      }));
  }

  public async sendMessage(subsetId: string, text: string, attachmentPath?: string): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    let attachment = undefined;
    if (attachmentPath !== undefined) {
      let name = attachmentPath.split('\\').pop()!.split('/').pop()!;
      let data: string = await invoke("get_base64_file", {
        path: attachmentPath
      });

      attachment = {
        name,
        data
      }
    }

    return fetch(`${API_ROUTE}/sendMessage`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        subset: subsetId,
        message: text,
        attachment
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
          return res.user;
        } else {
          return Promise.reject(res.error);
        }
      })
  }

  public updateUser(displayName?: string, bio?: string, image?: File): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    let promises = [];

    if (displayName !== undefined || bio !== undefined) {
      promises.push(fetch(`${API_ROUTE}/updateUser`, {
        method: "POST",
        body: JSON.stringify({
          token: this.token,
          displayName,
          bio
        })
      })
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            return;
          } else {
            return Promise.reject(res.error);
          }
        }));
    }

    if (image !== undefined) {
      promises.push(fetch(`${API_ROUTE}/updateUserImage`, {
        method: "POST",
        body: image,
        headers: {
          "X-Equion-Token": this.token,
          "X-File-Name": image.name
        }
      }));
    }

    return Promise.all(promises).then(() => { });
  }

  public getFileURL(id: string | null | undefined): string {
    if (id === null || id === undefined) return DEFAULT_PROFILE_IMAGE;
    return `${API_ROUTE}/files/${id}`;
  }

  public doesMessagePingMe(message: string): boolean {
    return message.includes(`<@${this.uid}>`);
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