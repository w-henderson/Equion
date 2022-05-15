import Peer, { MediaConnection } from "peerjs";

class Voice {
  peer: Peer;
  peerId: Promise<string>;
  ws: WebSocket;

  currentChannel: string | null;
  calls: MediaConnection[];

  allowedToCall: (id: string) => boolean;

  constructor(host: string, ws: WebSocket) {
    this.peer = new Peer({
      host,
      port: 80,
      path: "/voice",
      secure: false
    });

    this.peerId = new Promise(resolve => {
      this.peer.on("open", id => {
        resolve(id);
      });
    });

    this.ws = ws;

    this.currentChannel = null;
    this.calls = [];

    this.allowedToCall = () => false;
  }

  async init(token: string): Promise<void> {
    let peerId = await this.peerId;

    this.ws.send(JSON.stringify({
      command: "v1/connectUserVoice",
      token,
      peerId
    }));

    this.peer.on("call", async call => {
      if (this.allowedToCall(call.peer)) {
        this.calls.push(call);

        let localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        call.answer(localStream);

        call.on("stream", remoteStream => {
          let audio = new Audio();
          audio.srcObject = remoteStream;
          audio.play();
        });
      } else {
        console.warn("Someone tried to join your voice chat without permission.");
      }
    });
  }

  async getAudioStream() {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  public connectToVoiceChannel(token: string, channel: string) {
    this.ws.send(JSON.stringify({
      command: "v1/connectToVoiceChannel",
      token,
      channel
    }));
  }

  public leaveVoiceChannel(token: string) {
    this.ws.send(JSON.stringify({
      command: "v1/leaveVoiceChannel",
      token
    }));
  }

  public async connectToPeers(peers: string[]) {
    for (let peer of peers) {
      let call = this.peer.call(peer, await this.getAudioStream());
      this.calls.push(call);

      call.on("stream", remoteStream => {
        let audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
      });
    }
  }

  public disconnect() {
    for (let call of this.calls) {
      call.close();
    }

    this.calls = [];
  }
}

export default Voice;