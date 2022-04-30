import { forage } from "@tauri-apps/tauri-forage";
import toast from "react-hot-toast";

const API_ROUTE = "http://localhost/api/v1";

class Api {
  uid: string | null;
  token: string | null;
  ready: boolean;

  constructor() {
    this.ready = false;
    this.uid = null;
    this.token = null;
  }

  public async init(): Promise<boolean> {
    this.uid = await forage.getItem({ key: "uid" })();
    this.token = await forage.getItem({ key: "token" })();
    this.ready = true;

    return false;
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
          this.uid = res.uid;
          this.token = res.token;

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
          this.uid = res.uid;
          this.token = res.token;

          /*forage.setItem({ key: "uid", value: res.uid })();
          forage.setItem({ key: "token", value: res.token })();*/
        } else {
          return Promise.reject(res.error);
        }
      });
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
          image: "https://cdn.landesa.org/wp-content/uploads/default-user-image.png"
        });
      }
    });
  }
}

export default Api;