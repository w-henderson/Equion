import toast from "react-hot-toast";

import { DEFAULT_PROFILE_IMAGE } from "./Api";

class Subscriber {
  ws: WebSocket;
  onMessage: (message: MessageData, set: string, subset: string) => void;
  onSubset: (subset: SubsetData, set: string) => void;

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onmessage = this.onEvent.bind(this);
    this.ws.onerror = (e: any) => toast.error(e);

    this.onMessage = () => { };
    this.onSubset = () => { };
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
      this.onMessage({
        id: data.message.id,
        text: data.message.content,
        author: {
          id: data.message.author_id,
          name: data.message.author_name,
          image: data.message.author_image || DEFAULT_PROFILE_IMAGE,
        },
        timestamp: data.message.send_time * 1000
      }, data.set, data.subset);
    } else if (data.event === "v1/newSubset") {
      this.onSubset(data.subset, data.set);
    } else {
      toast.error(`Unknown event: ${data.event}`);
    }
  }
}

export default Subscriber;