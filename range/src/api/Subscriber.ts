import toast from "react-hot-toast";

class Subscriber {
  ws: WebSocket;
  onMessage: (message: MessageData, set: string, subset: string) => void;
  onSubset: (subset: SubsetData, set: string) => void;
  onUpdateUser: (set: string, user: UserData) => void;
  onLeftUser: (set: string, uid: string) => void;

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onmessage = this.onEvent.bind(this);
    this.ws.onerror = (e: any) => toast.error(e);

    this.onMessage = () => { };
    this.onSubset = () => { };
    this.onUpdateUser = () => { };
    this.onLeftUser = () => { };
  }

  subscribe(token: string, id: string) {
    this.ws.send(JSON.stringify({
      command: "v1/subscribe",
      token,
      set: id
    }));
  }

  unsubscribe(token: string, id: string) {
    this.ws.send(JSON.stringify({
      command: "v1/unsubscribe",
      token,
      set: id
    }));
  }

  onEvent(e: MessageEvent) {
    let data = JSON.parse(e.data);

    if (data.event === "v1/newMessage") {
      let hasAttachment = data.message.attachment !== null;

      this.onMessage({
        id: data.message.id,
        text: data.message.content,
        author: {
          uid: data.message.authorId,
          username: "",
          displayName: data.message.authorName,
          image: data.message.authorImage,
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
    } else {
      // Ignore invalid events
      // toast.error(`Unknown event: ${data.event}`);
    }
  }
}

export default Subscriber;