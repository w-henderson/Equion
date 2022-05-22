import Peer, { MediaConnection } from "peerjs";

const VOICE_HOST = process.env.REACT_APP_EQUION_VOICE_HOST || "localhost";
const VOICE_PORT = parseInt(process.env.REACT_APP_EQUION_VOICE_PORT || "80");
const VOICE_PATH = process.env.REACT_APP_EQUION_VOICE_PATH || "/voice";
const VOICE_SECURE: boolean = JSON.parse(process.env.REACT_APP_EQUION_VOICE_SECURE || "false");

interface Call {
  connection: MediaConnection,
  stream: MediaStream | null
}

class Voice {
  peer: Peer;
  peerId: Promise<string>;
  ws: WebSocket;

  currentChannel: string | null;
  self?: MediaStream;
  calls: Call[];

  allowedToCall: (id: string) => boolean;

  audioContext: AudioContext;
  userJoinAudio: HTMLAudioElement;
  userLeaveAudio: HTMLAudioElement;

  constructor(ws: WebSocket) {
    this.peer = new Peer({
      host: VOICE_HOST,
      port: VOICE_PORT,
      path: VOICE_PATH,
      secure: VOICE_SECURE
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

    this.audioContext = new AudioContext();
    this.userJoinAudio = new Audio("/audio/equion-02.ogg");
    this.userLeaveAudio = new Audio("/audio/equion-03.ogg");
    this.userJoinAudio.load();
    this.userLeaveAudio.load();
  }

  async init(token: string): Promise<void> {
    let peerId = await this.peerId;

    this.self = await this.getAudioStream();

    this.ws.send(JSON.stringify({
      command: "v1/connectUserVoice",
      token,
      peerId
    }));

    this.peer.on("call", async call => {
      if (this.allowedToCall(call.peer)) {
        this.calls.push({
          connection: call,
          stream: null
        });

        call.answer(this.self!);

        call.on("stream", remoteStream => this.initStream(remoteStream, call.peer));
      } else {
        console.warn("Someone tried to join your voice chat without permission.");
      }
    });
  }

  async getAudioStream() {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  public initStream(stream: MediaStream, peerId: string) {
    let callIndex = this.calls.findIndex(c => c.connection.peer === peerId);

    if (callIndex !== -1) {
      this.calls[callIndex].stream = stream;
    }

    let audio = new Audio();
    audio.srcObject = stream;
    audio.play();
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
      let call = this.peer.call(peer, this.self!);
      this.calls.push({
        connection: call,
        stream: null
      });

      call.on("stream", remoteStream => this.initStream(remoteStream, call.peer));
    }
  }

  public disconnect() {
    for (let call of this.calls) {
      call.connection.close();
    }

    this.calls = [];
  }

  public disconnectPeer(peerId: string) {
    let callIndex = this.calls.findIndex(c => c.connection.peer === peerId);

    if (callIndex !== -1) {
      this.calls[callIndex].connection.close();
      this.calls.splice(callIndex, 1);
    }
  }

  public playJoinAudio() {
    this.userJoinAudio.load();
    this.userJoinAudio.play();
  }

  public playLeaveAudio() {
    this.userLeaveAudio.load();
    this.userLeaveAudio.play();
  }
}

export default Voice;