/**
 * Manages subscriptions to events.
 */
class Subscriber {
  ws: WebSocket;
  ready: boolean;

  onPong: () => void;
  onMessage: (message: MessageData, set: string, subset: string) => void;
  onSubset: (subset: SubsetData, set: string) => void;
  onUpdateUser: (set: string, user: UserData) => void;
  onLeftUser: (set: string, uid: string) => void;
  onUserJoinedVoiceChannel: (set: string, user: VoiceUserData) => void;
  onUserLeftVoiceChannel: (set: string, uid: string) => void;

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
    this.onUpdateUser = () => null;
    this.onLeftUser = () => null;
    this.onUserJoinedVoiceChannel = () => null;
    this.onUserLeftVoiceChannel = () => null;
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

    if (data.event === "v1/newMessage") {
      const hasAttachment = data.message.attachment !== null;

      this.onMessage({
        id: data.message.id,
        text: data.message.content,
        author: {
          uid: data.message.authorId,
          username: "",
          displayName: data.message.authorName,
          image: data.message.authorImage,
          online: true
        },
        attachment: hasAttachment ? {
          id: data.message.attachment.id,
          name: data.message.attachment.name,
          type: data.message.attachment.type
        } : null,
        timestamp: data.message.sendTime * 1000
      }, data.set, data.subset);
    } else if (data.event === "v1/newSubset") {
      this.onSubset(data.subset, data.set);
    } else if (data.event === "v1/updateUser") {
      this.onUpdateUser(data.set, data.user);
    } else if (data.event === "v1/leftUser") {
      this.onLeftUser(data.set, data.uid);
    } else if (data.event === "v1/userJoinedVoiceChannel") {
      this.onUserJoinedVoiceChannel(data.set, data.user);
    } else if (data.event === "v1/userLeftVoiceChannel") {
      this.onUserLeftVoiceChannel(data.set, data.uid);
    } else if (data.event === "v1/pong") {
      this.onPong();
    } else {
      // Ignore invalid events
      // toast.error(`Unknown event: ${data.event}`);
    }
  }
}

export default Subscriber;