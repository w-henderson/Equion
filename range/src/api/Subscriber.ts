/**
 * An event which occurs at the set level.
 */
export type SetEvent<T> = {
  set: string,
  deleted: boolean,
  value: T,
}

/**
 * An event which occurs at the subset level.
 */
export type SubsetEvent<T> = {
  set: string,
  subset: string,
  deleted: boolean,
  value: T,
}

/**
 * Manages subscriptions to events.
 */
class Subscriber {
  ws: WebSocket;
  ready: boolean;

  onPong: () => void;
  onMessage: (e: SubsetEvent<MessageData>) => void;
  onSubset: (e: SetEvent<SubsetData>) => void;
  onUser: (e: SetEvent<UserData>) => void;
  onVoice: (e: SetEvent<VoiceUserData>) => void;
  onTyping: (subset: string, uid: string) => void;

  /**
   * Creates a new Subscriber instance, connecting through WebSocket to the given URL.
   * 
   * Initially, there will be no subscriptions or callbacks.
   */
  constructor(ws: WebSocket, onPong: () => void) {
    this.ws = ws;
    this.onPong = onPong;

    this.ws.onmessage = this.onEvent.bind(this);

    this.ready = false;

    this.onMessage = () => null;
    this.onSubset = () => null;
    this.onUser = () => null;
    this.onVoice = () => null;
    this.onTyping = () => null;
  }

  /**
   * Initialises the subscriber.
   * 
   * Currently does nothing.
   */
  init() {
    if (!this.ready) {
      this.ready = true;
    }
  }

  /**
   * Subscribes to the given set.
   */
  subscribe(token: string, id: string) {
    this.ws.send(JSON.stringify({
      command: "v1/subscribe",
      token,
      set: id
    }));
  }

  /**
   * Unsubscribes from the given set.
   */
  unsubscribe(token: string, id: string) {
    this.ws.send(JSON.stringify({
      command: "v1/unsubscribe",
      token,
      set: id
    }));
  }

  /**
   * Handles events by parsing the payload and calling the appropriate callback.
   */
  onEvent(e: MessageEvent) {
    const data = JSON.parse(e.data);

    if (data.event === "v1/message") {
      this.onMessage({
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
    } else if (data.event === "v1/subset") {
      this.onSubset({
        set: data.set,
        deleted: data.deleted,
        value: data.subset
      });
    } else if (data.event === "v1/user") {
      this.onUser({
        set: data.set,
        deleted: data.deleted,
        value: data.user
      });
    } else if (data.event === "v1/voice") {
      this.onVoice({
        set: data.set,
        deleted: data.deleted,
        value: data.user
      });
    } else if (data.event === "v1/typing") {
      this.onTyping(data.subset, data.uid);
    } else if (data.event === "v1/pong") {
      this.onPong();
    } else {
      // Ignore invalid events
      // toast.error(`Unknown event: ${data.event}`);
    }
  }
}

export default Subscriber;