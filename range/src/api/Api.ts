import EquionClient from "equion-api";

import { forage } from "@tauri-apps/tauri-forage";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import toast from "react-hot-toast";

import Notifier from "./Notifier";
import Voice from "./Voice";

import user from "../images/user.png";

export const DEFAULT_PROFILE_IMAGE = user;

/**
 * Represents the core API.
 * 
 * This class is responsible for interfacing with the backend through REST, WebSocket and WebRTC.
 */
class Api {
  client: EquionClient;
  image: string | null | undefined;
  ready: boolean;

  minimisedToTray: boolean;
  trayIcon: "default" | "notification";

  region: RegionData;

  notifier: Notifier;
  voice: Voice;

  onShow: () => void;
  onMessage: (e: SubsetEvent<MessageData>) => void;
  onSet: (e: SetEvent<SetUpdateData>) => void;
  onSubset: (e: SetEvent<SubsetData>) => void;
  onUser: (e: SetEvent<UserData>) => void;
  onVoice: (e: SetEvent<VoiceUserData>) => void;
  onTyping: (e: TypingEvent) => void;

  /**
   * Creates the API instance and connects to the backend through WebSocket.
   */
  constructor(client: EquionClient, region: RegionData, onPong: () => void) {
    this.client = client;
    this.region = region;

    this.client.on("pong", onPong);

    this.ready = false;
    this.image = null;
    this.minimisedToTray = false;
    this.trayIcon = "default";

    this.voice = new Voice(this.client, region);
    this.notifier = new Notifier(this.getFileURL.bind(this), this.doesMessagePingMe.bind(this));

    this.onShow = () => null;
    this.onMessage = () => null;
    this.onSet = () => null;
    this.onSubset = () => null;
    this.onUser = () => null;
    this.onVoice = () => null;
    this.onTyping = () => null;
  }

  /** 
   * Gets the UID of the current user.
   */
  public get uid(): string | null {
    return this.client.uid;
  }

  /**
   * Gets the token of the current user.
   */
  public get token(): string | null {
    return this.client.token;
  }

  /**
   * Initialises the API by checking stored credentials and setting up listeners.
   * 
   * @returns A promise that resolves to `true` if the user is logged in, `false` otherwise.
   */
  public async init(): Promise<boolean> {
    // Initialise authentication
    const token = await forage.getItem({ key: "token" })();

    if (token) {
      await this.client.validateToken(token).then(undefined, () => toast.error("Session expired, please sign in again."));
    }

    // Initialise the subscriber
    this.client.on("message", this.onMessage.bind(this));
    this.client.on("set", this.onSet.bind(this));
    this.client.on("subset", this.onSubset.bind(this));
    this.client.on("typing", this.onTyping.bind(this));

    await this.client.connect(this.region.wsRoute);

    this.client.on("voice", e => {
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
    });

    this.client.on("user", e => {
      if (e.value.uid !== this.uid) this.onUser(e);
    });

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
    await forage.setItem({ key: "uid", value: uid })();
    await forage.setItem({ key: "token", value: token })();

    this.image = await this.client.user(uid).then(res => res.image);

    await this.voice.init();
  }

  /**
   * Clears the authentication state.
   */
  public clearAuth() {
    forage.removeItem({ key: "uid" })();
    forage.removeItem({ key: "token" })();

    window.location.reload();
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
   * Sends the given message to the given subset.
   */
  public async sendMessageOverride(subsetId: string, text: string, attachmentPath?: string): Promise<void> {
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

    return this.client.sendMessage(subsetId, text, attachment);
  }

  /**
   * Gets the URL of the file with the given ID.
   */
  public getFileURL(id: string | null | undefined): string {
    if (id === null || id === undefined) return DEFAULT_PROFILE_IMAGE;
    return this.client.file(id);
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