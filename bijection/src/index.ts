import { EventEmitter } from "./events.js";
import { EquionRpc } from "./rpc.js";

class EquionApi extends EventEmitter {
  private rpc: EquionRpc;

  private cacheAuth: boolean;
  private token: string | null = null;
  public uid: string | null = null;

  constructor(url: string, options?: {
    cacheAuth?: boolean;
  }) {
    super();

    this.rpc = new EquionRpc(url);

    this.cacheAuth = options?.cacheAuth ?? false;
  }

  public async init(ws: string) {
    this.rpc.addEventListener(this.onEvent.bind(this));
    await this.rpc.init(ws);
  }

  private onEvent(data: any) {
    switch (data.event) {
      case "v1/message":
        return this.emit("message", {
          set: data.set,
          subset: data.subset,
          deleted: data.deleted,
          value: {
            id: data.message.id,
            text: data.message.content,
            author: {
              uid: data.message.authorId,
              username: "",
              displayName: data.message.authorName,
              image: data.message.authorImage,
              online: true
            },
            attachment: data.message.attachment ?? null,
            timestamp: data.message.sendTime * 1000
          }
        });

      case "v1/subset":
        return this.emit("subset", {
          set: data.set,
          deleted: data.deleted,
          value: data.subset
        });

      case "v1/user":
        return this.emit("user", {
          set: data.set,
          deleted: data.deleted,
          value: data.user
        });

      case "v1/voice":
        return this.emit("voice", {
          set: data.set,
          deleted: data.deleted,
          value: data.user
        });

      case "v1/typing":
        return this.emit("typing", data);

      case "v1/pong":
        return this.emit("pong", {});

      default:
        return;
    }
  }

  public login(username: string, password: string): Promise<{ token: string, uid: string }> {
    return this.rpc.get("v1/login", {
      data: { username, password }
    }).then(data => {
      if (this.cacheAuth) {
        this.token = data.token;
        this.uid = data.uid;
      }

      return data;
    });
  }

  public signup(username: string, password: string, displayName: string, email: string): Promise<{ token: string, uid: string }> {
    return this.rpc.get("v1/signup", {
      data: { username, password, displayName, email }
    }).then(data => {
      if (this.cacheAuth) {
        this.token = data.token;
        this.uid = data.uid;
      }

      return data;
    });
  }

  public logout(customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/logout", {
      data: { token }
    }).then(() => {
      if (this.cacheAuth) {
        this.token = null;
        this.uid = null;
      }
    });
  }

  public validateToken(customToken?: string): Promise<string> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/validateToken", {
      data: { token }
    }).then(data => data.uid);
  }

  public user(uid: string): Promise<UserData> {
    return this.rpc.get("v1/user", {
      data: { uid }
    }).then(data => data.user);
  }

  public updateUser(displayName?: string, bio?: string, image?: File, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    const promises = [];

    if (displayName !== undefined) {
      promises.push(this.rpc.get("v1/updateUser", {
        data: { token, displayName, bio }
      }));
    }

    if (image !== undefined) {
      promises.push(this.rpc.getHttp("v1/updateUserImage", {
        body: image,
        headers: {
          "X-Equion-Token": token,
          "X-File-Name": image.name
        }
      }));
    }

    return Promise.all(promises).then(() => { return; });
  }

  public sets(customToken?: string): Promise<SetData[]> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/sets", {
      data: { token }
    }).then(data => data.sets);
  }

  public set(id: string, customToken?: string): Promise<SetData> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/set", {
      data: { token, id }
    }).then(data => data.set);
  }

  public createSet(name: string, icon?: string, customToken?: string): Promise<SetData> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/createSet", {
      data: { token, name, icon }
    })
      .then(data => data.id)
      .then(id => this.set(id, token));
  }

  public createSubset(set: string, name: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/createSubset", {
      data: { token, set, name }
    });
  }

  public invites(set: string, customToken?: string): Promise<InviteData[]> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/invites", {
      data: { token, set }
    }).then(data => data.invites);
  }

  public invite(code: string): Promise<InviteData> {
    return this.rpc.get("v1/invite", {
      data: { code }
    }).then(data => data.invite);
  }

  public createInvite(set: string, duration?: number, code?: string, customToken?: string): Promise<string> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/createInvite", {
      data: {
        token,
        set,
        duration: duration ?? null,
        code: code ?? null
      }
    }).then(data => data.code);
  }

  public revokeInvite(set: string, id: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/revokeInvite", {
      data: { token, set, invite: id }
    });
  }

  public joinSet(code: string, customToken?: string): Promise<SetData> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/joinSet", {
      data: { token, code }
    })
      .then(data => data.id)
      .then(id => this.set(id, token));
  }

  public leaveSet(set: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/leaveSet", {
      data: { token, set }
    });
  }

  public updateSubset(subset: string, name?: string, remove?: boolean, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/updateSubset", {
      data: {
        token,
        subset,
        name: name ?? null,
        delete: remove ?? null
      }
    });
  }

  public messages(subset: string, before?: string, limit: number = 25, customToken?: string): Promise<MessageData[]> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/messages", {
      data: { token, subset, before, limit }
    })
      .then(res => {
        const messages = res.messages;
        messages.reverse();
        res.messages = messages;
        return res;
      })
      .then(res => res.messages.map((m: any) => {
        return {
          id: m.id,
          text: m.content,
          author: {
            uid: m.authorId,
            username: "",
            displayName: m.authorName,
            image: m.authorImage,
            online: false
          },
          attachment: m.attachment ?? null,
          timestamp: m.sendTime * 1000
        }
      }));
  }

  public sendMessage(subset: string, text: string, attachment?: { name: string, data: string }, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/sendMessage", {
      data: {
        token,
        subset,
        message: text,
        attachment
      }
    });
  }

  public updateMessage(message: string, content?: string, remove?: boolean, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/updateMessage", {
      data: {
        token,
        message,
        content: content ?? null,
        delete: remove ?? null
      }
    });
  }

  public typing(subset: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/typing", {
      data: { token, subset }
    });
  }

  public file(id: string): string {
    return `${this.rpc.url}/files/${id}`
  }

  public subscribe(set: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/subscribe", {
      data: { token, set }
    });
  }

  public unsubscribe(set: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/unsubscribe", {
      data: { token, set }
    });
  }

  public ping() {
    this.rpc.ping();
  }

  public connectUserVoice(peerId: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/connectUserVoice", {
      data: { token, peerId }
    });
  }

  public disconnectUserVoice(customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/disconnectUserVoice", {
      data: { token }
    });
  }

  public connectToVoiceChannel(channel: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/connectToVoiceChannel", {
      data: { token, channel }
    });
  }

  public leaveVoiceChannel(customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/leaveVoiceChannel", {
      data: { token }
    });
  }
}

export default EquionApi;