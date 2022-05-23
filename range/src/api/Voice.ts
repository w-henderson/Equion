import Peer, { MediaConnection } from "peerjs";

const VOICE_HOST = process.env.REACT_APP_EQUION_VOICE_HOST || "localhost";
const VOICE_PORT = parseInt(process.env.REACT_APP_EQUION_VOICE_PORT || "80");
const VOICE_PATH = process.env.REACT_APP_EQUION_VOICE_PATH || "/voice";
const VOICE_SECURE: boolean = JSON.parse(process.env.REACT_APP_EQUION_VOICE_SECURE || "false");

const SPEAKING_THRESHOLD = 0.005;

interface Call {
  connection: MediaConnection,
  stream: MediaStream | null,
  analyser: AnalyserNode | null,
  speaking: boolean,
}

interface Microphone {
  stream: MediaStream,
  analyser: AnalyserNode,
  speaking: boolean
}

class Voice {
  peer: Peer;
  peerId?: string;
  asyncPeerId: Promise<string>;
  ws: WebSocket;

  currentChannel: string | null;
  microphone?: Microphone;
  calls: Call[];

  allowedToCall: (id: string) => boolean;

  onSpeakingChange: (speaking: boolean, peerId: string) => void;

  audioContext: AudioContext;
  analyserThread?: number;
  userJoinAudio: HTMLAudioElement;
  userLeaveAudio: HTMLAudioElement;

  constructor(ws: WebSocket) {
    this.peer = new Peer({
      host: VOICE_HOST,
      port: VOICE_PORT,
      path: VOICE_PATH,
      secure: VOICE_SECURE
    });

    this.asyncPeerId = new Promise(resolve => {
      this.peer.on("open", id => {
        this.peerId = id;
        resolve(id);
      });
    });

    this.ws = ws;

    this.currentChannel = null;
    this.calls = [];

    this.allowedToCall = () => false;
    this.onSpeakingChange = () => { };

    this.audioContext = new AudioContext();
    this.userJoinAudio = new Audio("/audio/equion-02.ogg");
    this.userLeaveAudio = new Audio("/audio/equion-03.ogg");
    this.userJoinAudio.load();
    this.userLeaveAudio.load();
  }

  async init(token: string): Promise<void> {
    let peerId = await this.asyncPeerId;
    let stream = await this.getAudioStream();

    let source = this.audioContext.createMediaStreamSource(stream);
    let analyser = this.audioContext.createAnalyser();
    source.connect(analyser);

    this.microphone = {
      stream,
      analyser,
      speaking: false
    }

    this.ws.send(JSON.stringify({
      command: "v1/connectUserVoice",
      token,
      peerId
    }));

    this.peer.on("call", async call => {
      if (this.allowedToCall(call.peer)) {
        this.calls.push({
          connection: call,
          stream: null,
          analyser: null,
          speaking: false
        });

        call.answer(this.microphone!.stream);

        call.on("stream", remoteStream => this.initStream(remoteStream, call.peer));
      } else {
        console.warn("Someone tried to join your voice chat without permission.");
      }
    });

    if (this.analyserThread !== undefined) window.clearInterval(this.analyserThread);
    this.analyserThread = window.setInterval(this.speakingHandler.bind(this), 100);
  }

  async getAudioStream() {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  public initStream(stream: MediaStream, peerId: string) {
    let callIndex = this.calls.findIndex(c => c.connection.peer === peerId);

    if (callIndex !== -1) {
      this.calls[callIndex].stream = stream;

      let mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.calls[callIndex].analyser = this.audioContext.createAnalyser();
      mediaStreamSource.connect(this.calls[callIndex].analyser!);
    }

    let audio = new Audio();
    audio.srcObject = stream;
    audio.play();
  }

  public speakingHandler() {
    for (let call of this.calls) {
      let amplitude = this.getAmplitude(call.connection.peer);

      if (amplitude === null) continue;

      if (amplitude > SPEAKING_THRESHOLD) {
        if (!call.speaking) this.onSpeakingChange(true, call.connection.peer);
        call.speaking = true;
      } else {
        if (call.speaking) this.onSpeakingChange(false, call.connection.peer);
        call.speaking = false;
      }
    }

    if (this.microphone !== undefined) {
      let amplitude = this.getAnalyserAmplitude(this.microphone.analyser);

      if (amplitude > SPEAKING_THRESHOLD) {
        if (!this.microphone.speaking) this.onSpeakingChange(true, this.peerId!);
        this.microphone.speaking = true;
      } else {
        if (this.microphone.speaking) this.onSpeakingChange(false, this.peerId!);
        this.microphone.speaking = false;
      }
    }
  }

  public getAmplitude(peerId: string): number | null {
    let callIndex = this.calls.findIndex(c => c.connection.peer === peerId);

    if (callIndex === -1) return null;
    if (this.calls[callIndex].analyser === null) return null;

    return this.getAnalyserAmplitude(this.calls[callIndex].analyser!);
  }

  public getAnalyserAmplitude(analyser: AnalyserNode): number {
    let data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(data);

    let sumOfSquares = 0;
    for (let i = 0; i < data.length; i++) {
      // eslint-disable-next-line
      sumOfSquares += data[i] * data[i];
    }

    return Math.sqrt(sumOfSquares / data.length);
  }

  public connectToVoiceChannel(token: string, channel: string) {
    this.audioContext.resume();
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
      let call = this.peer.call(peer, this.microphone!.stream);
      this.calls.push({
        connection: call,
        stream: null,
        analyser: null,
        speaking: false
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