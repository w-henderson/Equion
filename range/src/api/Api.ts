import { forage } from "@tauri-apps/tauri-forage";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import toast from "react-hot-toast";

import Subscriber, { SetEvent, SubsetEvent } from "./Subscriber";
import Notifier from "./Notifier";
import Voice from "./Voice";

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

  region: RegionData;

  onShow: () => void;
  onMessage: (e: SubsetEvent<MessageData>) => void;
  onSubset: (e: SetEvent<SubsetData>) => void;
  onUser: (e: SetEvent<UserData>) => void;
  onVoice: (e: SetEvent<VoiceUserData>) => void;
  onTyping: (subset: string, uid: string) => void;

  /**
   * Creates the API instance and connects to the backend through WebSocket.
   */
  constructor(ws: WebSocket, region: RegionData, onPong: () => void) {
    this.ready = false;
    this.uid = null;
    this.token = null;
    this.image = null;
    this.minimisedToTray = false;
    this.trayIcon = "default";

    this.subscriber = new Subscriber(ws, onPong);
    this.voice = new Voice(this.subscriber.ws, region);
    this.notifier = new Notifier(this.getFileURL.bind(this), this.doesMessagePingMe.bind(this));

    this.region = region;

    this.onShow = () => null;
    this.onMessage = () => null;
    this.onSubset = () => null;
    this.onUser = () => null;
    this.onVoice = () => null;
    this.onTyping = () => null;
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
      const response = await fetch(`${this.region.apiRoute}/validateToken`, {
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
    this.subscriber.onTyping = this.onTyping;
    this.subscriber.init();

    this.subscriber.onVoice = e => {
      if (e.deleted) {
        if (this.voice.currentChannel === e.set) {
          this.voice.playLeaveAudio();
        }

        if (this.uid === e.value.user.uid) {
          this.voice.currentChannel = null;
        }
      } else {
        if (this.uid === e.value.user.uid) {
          this.voice.currentChannel = e.set;
        }

        if (this.voice.currentChannel === e.set) {
          this.voice.playJoinAudio();
        }
      }

      this.onVoice(e);
    };

    this.subscriber.onUser = e => {
      if (e.value.uid !== this.uid) this.onUser(e);
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
    return fetch(`${this.region.apiRoute}/login`, {
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
    return fetch(`${this.region.apiRoute}/signup`, {
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

    return fetch(`${this.region.apiRoute}/logout`, {
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

    return fetch(`${this.region.apiRoute}/sets`, {
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

    return fetch(`${this.region.apiRoute}/set`, {
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

    return fetch(`${this.region.apiRoute}/createSet`, {
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
   * Joins the current user to the set with the given code.
   */
  public joinSet(code: string): Promise<SetData> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${this.region.apiRoute}/joinSet`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        code
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
   * Leaves the current user from the given set.
   */
  public leaveSet(id: string): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${this.region.apiRoute}/leaveSet`, {
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
   * Gets all the invite codes for the given set.
   */
  public getInvites(set: string): Promise<InviteData[]> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${this.region.apiRoute}/invites`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        set
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          return res.invites;
        } else {
          return Promise.reject(res.error);
        }
      });
  }

  /**
   * Creates an invite code for the given set.
   */
  public createInvite(set: string, duration?: number, code?: string): Promise<string> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${this.region.apiRoute}/createInvite`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        set,
        duration: duration ?? null,
        code: code ?? null
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          return res.code;
        } else {
          return Promise.reject(res.error);
        }
      });
  }

  /**
   * Revokes the given invite code.
   */
  public revokeInvite(set: string, id: string): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${this.region.apiRoute}/revokeInvite`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        set,
        invite: id
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

    return fetch(`${this.region.apiRoute}/createSubset`, {
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
   * Updates or deletes the given subset.
   */
  public updateSubset(id: string, name?: string, remove?: boolean): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${this.region.apiRoute}/updateSubset`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        subset: id,
        name: name ?? null,
        delete: remove ?? null
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
   * Updates or deletes the given message.
   */
  public updateMessage(id: string, content?: string, remove?: boolean): Promise<void> {
    if (this.token === null) return Promise.reject("Not logged in");

    return fetch(`${this.region.apiRoute}/updateMessage`, {
      method: "POST",
      body: JSON.stringify({
        token: this.token,
        message: id,
        content: content ?? null,
        delete: remove ?? null
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

    return fetch(`${this.region.apiRoute}/messages`, {
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

    return fetch(`${this.region.apiRoute}/sendMessage`, {
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
    return fetch(`${this.region.apiRoute}/user`, {
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
      promises.push(fetch(`${this.region.apiRoute}/updateUser`, {
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
      promises.push(fetch(`${this.region.apiRoute}/updateUserImage`, {
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
   * Informs the server as to the current typing state.
   */
  public setTyping(subset: string) {
    this.subscriber.ws.send(JSON.stringify({
      command: "v1/typing",
      token: this.token!,
      subset
    }));
  }

  /**
   * Gets the URL of the file with the given ID.
   */
  public getFileURL(id: string | null | undefined): string {
    if (id === null || id === undefined) return DEFAULT_PROFILE_IMAGE;
    return `${this.region.apiRoute}/files/${id}`;
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