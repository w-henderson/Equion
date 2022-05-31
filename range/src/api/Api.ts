import { forage } from "@tauri-apps/tauri-forage";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import toast from "react-hot-toast";

import Subscriber from "./Subscriber";
import Notifier from "./Notifier";
import Voice from "./Voice";

export const API_ROUTE = process.env.REACT_APP_EQUION_API_ROUTE || "http://localhost/api/v1";
export const WS_ROUTE = process.env.REACT_APP_EQUION_WS_ROUTE || "ws://localhost/ws";

export const DEFAULT_PROFILE_IMAGE = "https://cdn.landesa.org/wp-content/uploads/default-user-image.png";

/**
 * Represents the core API.
 * 
 * This class is responsible for interfacing with the backend through REST, WebSocket and WebRTC.
 */
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

  /**
   * Creates the API instance and connects to the backend through WebSocket.
   */
  constructor(ws: WebSocket, onPong: () => void) {
    this.ready = false;
    this.uid = null;
    this.token = null;
    this.image = null;
    this.minimisedToTray = false;
    this.trayIcon = "default";

    this.subscriber = new Subscriber(ws, onPong);
    this.voice = new Voice(this.subscriber.ws);
    this.notifier = new Notifier(this.getFileURL.bind(this), this.doesMessagePingMe.bind(this));

    this.onShow = () => null;
    this.onMessage = () => null;
    this.onSubset = () => null;
    this.onUpdateUser = () => null;
    this.onLeftUser = () => null;
    this.onUserJoinedVoiceChannel = () => null;
    this.onUserLeftVoiceChannel = () => null;
  }

  /**
   * Initialises the API by checking stored credentials and setting up listeners.
   * 
   * @returns A promise that resolves to `true` if the user is logged in, `false` otherwise.
   */
  public async init(): Promise<boolean> {
    // Initialise authentication
    this.token = await forage.getItem({ key: "token" })();

    if (this.token) {
      const response = await fetch(`${API_ROUTE}/validateToken`, {
        method: "POST",
        body: JSON.stringify({ token: this.token })
      }).then(res => res.json());

      if (response.success) {
        this.uid = response.uid;
      } else {
        toast.error("Session expired, please sign in again.");
      }
    }

    // Initialise the subscriber
    this.subscriber.onMessage = this.onMessage;
    this.subscriber.onSubset = this.onSubset;
    this.subscriber.init();

    this.subscriber.onUserJoinedVoiceChannel = (set: string, user: VoiceUserData) => {
      if (this.uid === user.user.uid) {
        this.voice.currentChannel = set;
      }

      if (this.voice.currentChannel === set) {
        this.voice.playJoinAudio();
      }

      this.onUserJoinedVoiceChannel(set, user);
    };

    this.subscriber.onUserLeftVoiceChannel = (set: string, uid: string) => {
      if (this.voice.currentChannel === set) {
        this.voice.playLeaveAudio();
      }

      if (this.uid === uid) {
        this.voice.currentChannel = null;
      }

      this.onUserLeftVoiceChannel(set, uid);
    };

    this.subscriber.onUpdateUser = (set, user) => {
      if (user.uid !== this.uid) this.onUpdateUser(set, user);
    };

    this.subscriber.onLeftUser = (set, uid) => {
      if (uid !== this.uid) this.onLeftUser(set, uid);
    };

    listen("show", () => {
      this.minimisedToTray = false;
      this.onShow();
    });

    invoke("set_notification_icon", { icon: "default" });

    this.ready = true;

    // Whether the user is already authenticated.
    return this.uid !== null;
  }

  /**
   * Finishes the login process by initialising voice chat and caching the user's details.
   */
  public async finishAuth(uid: string, token: string) {
    this.uid = uid;
    this.token = token;
    this.image = await this.getUserByUid(uid).then(res => res.image);

    await this.voice.init(token);
  }

  /**
   * Shows an error in the UI.
   */
  public errorHandler(e: string) {
    toast.error(e);
  }

  /**
   * Returns the current user's ID.
   */
  public getUid(): string {
    return this.uid || "";
  }

  /**
   * Minimises the app to the tray.
   */
  public minimiseToTray() {
    this.minimisedToTray = true;
    appWindow.hide();
  }

  /**
   * Sets the tray icon to the given icon.
   * 
   * Calls the Rust API to set the icon.
   */
  public setTrayIcon(icon: "default" | "notification") {
    if (this.trayIcon !== icon) {
      this.trayIcon = icon;
      invoke("set_notification_icon", { icon });
    }
  }

  /**
   * Attempts to log in the user with the given credentials.
   */
  public login(username: string, password: string): Promise<void> {
    return fetch(`${API_ROUTE}/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          forage.setItem({ key: "token", value: res.token })();

          return this.finishAuth(res.uid, res.token);
        } else {
          return Promise.reject(res.error);
        }
      });
  }

  /**
   * Attempts to register the user with the given credentials.
   */
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

  /**
   * Logs out the current user.
   */
  public logout(): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${API_ROUTE}/logout`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          forage.removeItem({ key: "uid" })();
          forage.removeItem({ key: "token" })();

          window.location.reload();
        } else {
          return Promise.reject(res.error);
        }
      });
  }

  /**
   * Gets the user's sets.
   */
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

  /**
   * Gets the set with the given ID.
   */
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

  /**
   * Creates a new set with the given name and optionally icon.
   */
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

  /**
   * Joins the current user to the given set.
   */
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

  /**
   * Leaves the current user from the given set.
   */
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

  /**
   * Creates a subset of the given set with the given name.
   */
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
      });
  }

  /**
   * Gets the messages of the given subset.
   * 
   * @param subsetId The ID of the subset.
   * @param before The ID of the message to get messages before.
   * @param limit The maximum number of messages to get.
   */
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
        const messages = res.messages;
        messages.reverse();
        res.messages = messages;
        return res;
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(res => res.messages.map((m: any) => {
        const hasAttachment = m.attachment !== null;

        const result: MessageData = {
          id: m.id,
          text: m.content,
          author: {
            uid: m.authorId,
            username: "",
            displayName: m.authorName,
            image: m.authorImage,
            online: false
          },
          attachment: hasAttachment ? {
            id: m.attachment.id,
            name: m.attachment.name,
            type: m.attachment.type
          } : null,
          timestamp: m.sendTime * 1000
        };

        return result;
      }));
  }

  /**
   * Sends the given message to the given subset.
   */
  public async sendMessage(subsetId: string, text: string, attachmentPath?: string): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    let attachment = undefined;
    if (attachmentPath !== undefined) {
      const name = attachmentPath.split("\\").pop()?.split("/").pop();

      if (name === undefined) return Promise.reject("Attachment error");

      const data: string = await invoke("get_base64_file", {
        path: attachmentPath
      });

      attachment = {
        name,
        data
      };
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
      });
  }

  /**
   * Gets the given user's details.
   */
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
      });
  }

  /**
   * Updates the current user's details.
   */
  public updateUser(displayName?: string, bio?: string, image?: File): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    const promises = [];

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

    return Promise.all(promises).then(() => { return; });
  }

  /**
   * Gets the URL of the file with the given ID.
   */
  public getFileURL(id: string | null | undefined): string {
    if (id === null || id === undefined) return DEFAULT_PROFILE_IMAGE;
    return `${API_ROUTE}/files/${id}`;
  }

  /**
   * Checks whether the given message pings the current uesr.
   */
  public doesMessagePingMe(message: string): boolean {
    return message.includes(`<@${this.uid}>`);
  }

  /**
   * Gets a Greek letter corresponding to the character.
   * This is done visually.
   */
  /* eslint-disable */
  public getGreekLetter(char: string): string {
    switch (char) {
      case "a": return "α";
      case "b": return "β";
      case "c": return "χ";
      case "d": return "δ";
      case "e": return "ε";
      case "f": return "φ";
      case "g": return "γ";
      case "h": return "η";
      case "i": return "ι";
      case "j": return "ψ";
      case "k": return "κ";
      case "l": return "λ";
      case "m": return "μ";
      case "n": return "ν";
      case "o": return "ο";
      case "p": return "π";
      case "q": return "ς";
      case "r": return "ρ";
      case "s": return "σ";
      case "t": return "τ";
      case "u": return "υ";
      case "v": return "ν";
      case "w": return "ω";
      case "x": return "ξ";
      case "y": return "ψ";
      case "z": return "ζ";
      default: return "λ";
    }
  }
}

export default Api;