import { EventEmitter } from "./events.js";
import { EquionRpc } from "./rpc.js";

/**
 * The Equion client API.
 */
class EquionClient extends EventEmitter {
  public rpc: EquionRpc;

  private cacheAuth: boolean;
  public token: string | null = null;
  public uid: string | null = null;

  /**
   * Initializes the API to use HTTP.
   * 
   * @param url The HTTP URL to connect to.
   * @param options Configuration options.
   */
  constructor(url: string, options?: {
    /**
     * Whether to cache the authentication tokens returned by the `v1/login` and `v1/signup` endpoints.
     */
    cacheAuth?: boolean;
  }) {
    super();

    this.rpc = new EquionRpc(url);

    this.cacheAuth = options?.cacheAuth ?? false;
  }

  /**
   * Connects the API to the server over WebSocket.
   * 
   * This is required for receiving real-time events and using voice chat.
   * When initialized, the API will also use WebSocket where possible over HTTP to improve performance.
   * 
   * @param ws The WebSocket URL to connect to.
   */
  public async connect(ws: string) {
    this.rpc.addEventListener(this.onEvent.bind(this));
    await this.rpc.connect(ws);
    this.emit("ready", {});
  }

  /**
   * Disconnects from the server by closing the WebSocket connection.
   * 
   * Requests can still be sent, but they will be sent over HTTP, and events will no longer be received.
   */
  public disconnect() {
    this.rpc.disconnect();
  }

  /**
   * Calls the appropriate event handler for the given event data.
   * 
   * @param data The event data object.
   */
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

      case "v1/set":
        return this.emit("set", {
          set: data.set,
          deleted: data.deleted,
          value: data.data
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

      case "virtual/disconnect":
        return this.emit("close", {});

      default:
        return;
    }
  }

  /**
   * Asserts that the username and password combination are valid, then returns a token that can be used to authenticate future requests.
   * The token does not expire, but can be invalidated with `logout`.
   * 
   * @param username The username of the user to sign in.
   * @param password The password of the user to sign in.
   * @returns The user's token and UID, if successful.
   */
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

  /**
   * Signs up a user with the given details. Further customisation should be done with `updateUser`.
   * The user will be automatically logged in, so a token will be returned, along with the new user's ID.
   * If the user name already exists, an error will occur.
   * 
   * @param username The username of the new user to create.
   * @param password The password of the new username to create.
   * @param displayName The display name of the new user to create.
   * @param email The email of the new user to create.
   * @returns The new user's token and UID, if successful.
   */
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

  /**
   * Logs out the user and invalidates the token.
   * 
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
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

  /**
   * Asserts that the token is valid, and if so, returns the user's ID.
   * This can be used for restoring sessions.
   * 
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   * @returns The user's ID.
   */
  public validateToken(customToken?: string): Promise<string> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/validateToken", {
      data: { token }
    })
      .then(data => {
        if (this.cacheAuth) {
          this.token = token;
          this.uid = data.uid;
        }

        return data.uid;
      })
  }

  /**
   * Gets details for the user with the given ID. This endpoint does not require authentication.
   * The user's email is currently returned, but this is likely to change in the future.
   * 
   * @param uid The UID of the user to get.
   * @returns The user's information.
   */
  public user(uid: string): Promise<UserData> {
    return this.rpc.get("v1/user", {
      data: { uid }
    }).then(data => data.user);
  }

  /**
   * Updates the current user's details. This endpoint requires authentication to identify and authenticate the user.
   * Only specified fields will be updated. 
   *
   * @param displayName The display name to update the user with.
   * @param bio The bio to update the user with.
   * @param image The image to update the user with.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
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

  /**
   * Returns all of the current user's sets, in the order in which they were joined.
   * 
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   * @returns The user's sets.
   */
  public sets(customToken?: string): Promise<SetData[]> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/sets", {
      data: { token }
    }).then(data => data.sets);
  }

  /**
   * Gets details for a specific set.
   * This endpoint requires authentication, and will return an error if the user is not a member of the set.
   * 
   * @param id The ID of the set to get.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   * @returns The set's data.
   */
  public set(id: string, customToken?: string): Promise<SetData> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/set", {
      data: { token, id }
    }).then(data => data.set);
  }

  /**
   * Creates a new set with the given name, and icon if supplied.
   * Returns the ID of the new set.
   * The authenticated user will automatically become a member of the set, and will also be given administrative privileges over the set.
   * 
   * @param name The name of the set to create.
   * @param icon The icon of the set to create.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   * @returns The new set's data.
   */
  public createSet(name: string, icon?: string, customToken?: string): Promise<SetData> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/createSet", {
      data: { token, name, icon }
    })
      .then(data => data.id)
      .then(id => this.set(id, token));
  }

  /**
   * Creates a new subset.
   * 
   * @param set The set which the new subset is to be a part of.
   * @param name The name of the new subset.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public createSubset(set: string, name: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/createSubset", {
      data: { token, set, name }
    });
  }

  /**
   * Gets the invites for the given set. Requires the user to be a member.
   * 
   * @param set The set to get the invites of.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   * @returns The invites.
   */
  public invites(set: string, customToken?: string): Promise<InviteData[]> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/invites", {
      data: { token, set }
    }).then(data => data.invites);
  }

  /**
   * Gets information about the specific invite. Does not require authentication.
   * 
   * @param code The code of the invite.
   * @returns The invite's data.
   */
  public invite(code: string): Promise<InviteData> {
    return this.rpc.get("v1/invite", {
      data: { code }
    }).then(data => data.invite);
  }

  /**
   * Creates a new invite code for the given set. Requires the user to be an administrator of the set.
   * If a custom code is specified, the user must subscribe to Equion Diffontial (maybe coming soon?) to use it.
   * 
   * @param set The set which the invite is to be associated with.
   * @param duration The duration in seconds before the invite expires.
   * @param code The custom code for the invite (requires Equion Diffontial).
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   * @returns The code of the invite.
   */
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

  /**
   * Revokes an invite for the given set. Requires the user to be an administrator of the set.
   * 
   * @param set The set which the invite is for.
   * @param id The ID of the invite.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public revokeInvite(set: string, id: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/revokeInvite", {
      data: { token, set, invite: id }
    });
  }

  /**
   * Joins the user to the set with the given invite code.
   * 
   * @param code The code of the invite.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   * @returns The data of the newly-joined set.
   */
  public joinSet(code: string, customToken?: string): Promise<SetData> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/joinSet", {
      data: { token, code }
    })
      .then(data => data.id)
      .then(id => this.set(id, token));
  }

  /**
   * Leaves the set.
   * 
   * @param set The set to leave.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public leaveSet(set: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/leaveSet", {
      data: { token, set }
    });
  }

  /**
   * Updates or deletes the set. Requires the user to be an administrator of the set.
   * 
   * @param set The set to update.
   * @param name The new name of the set.
   * @param icon The new icon of the set.
   * @param remove Whether to remove the set.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public updateSet(set: string, name?: string, icon?: string, remove?: boolean, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/updateSet", {
      data: {
        token,
        set,
        name: name ?? null,
        icon: icon ?? null,
        delete: remove ?? null
      }
    });
  }

  /**
   * Updates or deletes the subset. Requires the user to be an administrator of the set.
   * 
   * @param subset The subset to update.
   * @param name The new name of the subset.
   * @param remove Whether to remove the subset.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
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

  /**
   * Kicks the specified user from the given set. Requires the user to be an administrator of the set.
   * 
   * @param set The set to kick the user from.
   * @param user The user to kick.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public kick(set: string, user: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/kick", {
      data: {
        token,
        set,
        uid: user
      }
    });
  }

  /**
   * Gets messages from the given subset.
   * 
   * @param subset The subset to get messages from.
   * @param before The ID of the message to get messages before.
   * @param limit The maximimum number of messages to get (defaults to 25).
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   * @returns The messages.
   */
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

  /**
   * Sends a message.
   * 
   * @param subset The subset to send the message to.
   * @param text The content of the message.
   * @param attachment The attachment, if any. The data should be base64 encoded.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
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

  /**
   * Updates or deletes a message. Requires the user to be the author of the message.
   * 
   * @param message The ID of the message.
   * @param content The new content of the message.
   * @param remove Whether to remove the message.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
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

  /**
   * Informs members of the given set that the user has recently typed in the message box.
   * 
   * @param subset The subset in which the user is currently typing.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public typing(subset: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/typing", {
      data: { token, subset }
    });
  }

  /**
   * Converts a file ID into a URL where it can be found.
   * 
   * Since files are currently stored in the database, this function just adds the ID to the end of the file API route.
   * In the future, when we migrate to S3, this function will be a lot more important, but it is here for future-proofing the API at the moment.
   * 
   * @param id The ID of the file.
   * @returns The URL of the file.
   */
  public file(id: string): string {
    return `${this.rpc.url}/api/v1/files/${id}`
  }

  /**
   * Subscribes the API to events for the given set.
   * 
   * @param set The set to subscribe to events for.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public subscribe(set: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/subscribe", {
      data: { token, set }
    });
  }

  /**
   * Unsubscribes the API from events for the given set.
   * 
   * @param set The set to unsubscribe from events for.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public unsubscribe(set: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/unsubscribe", {
      data: { token, set }
    });
  }

  /**
   * Pings the server, triggering a pong event.
   */
  public ping() {
    this.rpc.ping();
  }

  /**
   * Registers the peer ID with the user, enabling use of voice chat features.
   * 
   * @param peerId The PeerJS ID to associate with the user.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public connectUserVoice(peerId: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/connectUserVoice", {
      data: { token, peerId }
    });
  }

  /**
   * Unregisters a user's connection to the PeerJS voice server.
   * 
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public disconnectUserVoice(customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/disconnectUserVoice", {
      data: { token }
    });
  }

  /**
   * Connects the user to the voice channel.
   * Requires that the user be registered with the voice server.
   * 
   * @param channel The channel to join.
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public connectToVoiceChannel(channel: string, customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/connectToVoiceChannel", {
      data: { token, channel }
    });
  }

  /**
   * Disconnects the user from any voice channel they may be in.
   * 
   * @param customToken The token to use for the request. If not specified, the cached token will be used.
   */
  public leaveVoiceChannel(customToken?: string): Promise<void> {
    const token = customToken ?? this.token;
    if (token === null) return Promise.reject("No token");

    return this.rpc.get("v1/leaveVoiceChannel", {
      data: { token }
    });
  }
}

export default EquionClient;