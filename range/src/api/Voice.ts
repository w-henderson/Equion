/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Peer, { MediaConnection } from "peerjs";

const SPEAKING_THRESHOLD = 0.005;

interface Call {
  connection: MediaConnection,
  stream: MediaStream | null,
  analyser: AnalyserNode | null,
  gain: GainNode | null,
  speaking: boolean,
}

interface Screenshare {
  connection: MediaConnection,
  stream: MediaStream | null,
}

interface Microphone {
  inputStream: MediaStream,
  analyser: AnalyserNode,
  gain: GainNode,
  outputStream: MediaStreamAudioDestinationNode,
  speaking: boolean
}

/**
 * Handles voice chat connections.
 */
class Voice {
  peer: Peer;
  peerId?: string;
  asyncPeerId: Promise<string>;
  ws: WebSocket;

  currentChannel: string | null;
  microphone?: Microphone;
  screenshare?: MediaStream;

  calls: Call[];
  screenshares: Screenshare[];
  outboundScreenshares: Screenshare[];

  allowedToCall: (id: string) => boolean;

  onSpeakingChange: (speaking: boolean, peerId: string) => void;
  onNewScreenshare: (peerId: string, stream: MediaStream) => void;
  onEndScreenshare: (peerId: string) => void;

  audioContext: AudioContext;
  analyserThread?: number;
  userJoinAudio: HTMLAudioElement;
  userLeaveAudio: HTMLAudioElement;
  userStartScreenshareAudio: HTMLAudioElement;
  userEndScreenshareAudio: HTMLAudioElement;

  /**
   * Creates a new voice chat instance.
   * 
   * Connects to the PeerJS server.
   */
  constructor(ws: WebSocket, region: RegionData) {
    this.peer = new Peer(region.voice);

    this.asyncPeerId = new Promise(resolve => {
      this.peer.on("open", id => {
        this.peerId = id;
        resolve(id);
      });
    });

    this.ws = ws;

    this.currentChannel = null;
    this.calls = [];
    this.screenshares = [];
    this.outboundScreenshares = [];

    this.allowedToCall = () => false;
    this.onSpeakingChange = () => null;
    this.onNewScreenshare = () => null;
    this.onEndScreenshare = () => null;

    this.audioContext = new AudioContext();

    this.userJoinAudio = new Audio("/audio/equion-02.ogg");
    this.userLeaveAudio = new Audio("/audio/equion-03.ogg");
    this.userStartScreenshareAudio = new Audio("/audio/equion-04.ogg");
    this.userEndScreenshareAudio = new Audio("/audio/equion-05.ogg");

    this.userJoinAudio.load();
    this.userLeaveAudio.load();
    this.userStartScreenshareAudio.load();
    this.userEndScreenshareAudio.load();
  }

  /**
   * Initialises the voice functionality.
   * 
   * This waits for the PeerJS node to be ready and then registers it with the server.
   * It also creates the post-processing graph for the microphone.
   */
  async init(token: string): Promise<void> {
    const peerId = await this.asyncPeerId;
    const stream = await this.getAudioStream();

    const inputStream = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    const gain = this.audioContext.createGain();
    inputStream.connect(analyser);
    inputStream.connect(gain);

    const outputStream = this.audioContext.createMediaStreamDestination();
    gain.connect(outputStream);

    this.microphone = {
      inputStream: stream,
      analyser,
      gain,
      outputStream,
      speaking: false
    };

    this.ws.send(JSON.stringify({
      command: "v1/connectUserVoice",
      token,
      peerId
    }));

    this.peer.on("call", async call => {
      if (this.allowedToCall(call.peer)) {
        if (call.metadata.mode === "voice") {
          this.calls.push({
            connection: call,
            stream: null,
            analyser: null,
            gain: null,
            speaking: false
          });

          call.answer(this.microphone!.outputStream.stream);

          call.on("stream", remoteStream => this.initStream(remoteStream, call.peer));

          // If screensharing, share with new peer
          if (this.screenshare) {
            const screenshare = this.peer.call(call.peer, this.screenshare, {
              metadata: {
                mode: "screenshare",
                initial: false
              }
            });

            this.outboundScreenshares.push({
              connection: screenshare,
              stream: null,
            });
          }
        } else if (call.metadata.mode === "screenshare") {
          this.screenshares.push({
            connection: call,
            stream: null
          });

          call.answer();

          call.on("stream", remoteStream => this.initScreenshareStream(remoteStream, call.peer, call.metadata.initial));
          call.on("close", () => this.onEndScreenshare(call.peer));
          call.on("iceStateChanged", state => {
            if (state === "closed" || state === "failed" || state === "disconnected") {
              this.onEndScreenshare(call.peer);

              this.userEndScreenshareAudio.load();
              this.userEndScreenshareAudio.play();
            }
          });
        }
      } else {
        console.warn("Someone tried to join your voice chat without permission.");
      }
    });

    if (this.analyserThread !== undefined) window.clearInterval(this.analyserThread);
    this.analyserThread = window.setInterval(this.speakingHandler.bind(this), 100);
  }

  /**
   * Gets the audio stream from the microphone.
   */
  async getAudioStream() {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  /**
   * Gets the screenshare stream from the display.
   */
  async getScreenshareStream() {
    return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  }

  /**
   * Initialises and plays an audio stream.
   * 
   * This is called whenever a new stream is received from a peer.
   * It sets up the post-processing graph and starts playing the stream.
   */
  public initStream(stream: MediaStream, peerId: string) {
    const callIndex = this.calls.findIndex(c => c.connection.peer === peerId);

    if (callIndex !== -1) {
      this.calls[callIndex].stream = stream;

      const mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

      this.calls[callIndex].analyser = this.audioContext.createAnalyser();
      this.calls[callIndex].gain = this.audioContext.createGain();

      mediaStreamSource.connect(this.calls[callIndex].analyser!);

      // work around for https://bugs.chromium.org/p/chromium/issues/detail?id=933677
      new Audio().srcObject = stream;

      mediaStreamSource.connect(this.calls[callIndex].gain!);
      this.calls[callIndex].gain!.connect(this.audioContext.destination);
    }
  }

  /**
   * Initialises a screenshare stream.
   * 
   * This is called whenever a new screenshare is received from a peer.
   */
  public initScreenshareStream(stream: MediaStream, peerId: string, playSound: boolean) {
    const screenshareIndex = this.screenshares.findIndex(c => c.connection.peer === peerId);

    if (screenshareIndex !== -1) {
      this.screenshares[screenshareIndex].stream = stream;
      this.onNewScreenshare(peerId, stream);

      if (playSound) {
        this.userStartScreenshareAudio.load();
        this.userStartScreenshareAudio.play();
      }
    }
  }

  /**
   * Set the volume for the given peer's stream.
   */
  public setVolume(peerId: string, volume: number) {
    const callIndex = this.calls.findIndex(c => c.connection.peer === peerId);

    if (callIndex !== -1) {
      this.calls[callIndex].gain!.gain.value = volume * volume * volume;
    }
  }

  /**
   * Set the volume for the microphone.
   */
  public setMicrophoneVolume(volume: number) {
    this.microphone!.gain!.gain.value = volume * volume * volume;
  }

  /**
   * Handles changes in who is speaking.
   * 
   * This is called every 100ms.
   */
  public speakingHandler() {
    for (const call of this.calls) {
      const amplitude = this.getAmplitude(call.connection.peer);

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
      const amplitude = this.getAnalyserAmplitude(this.microphone.analyser);

      if (amplitude > SPEAKING_THRESHOLD) {
        if (!this.microphone.speaking) this.onSpeakingChange(true, this.peerId!);
        this.microphone.speaking = true;
      } else {
        if (this.microphone.speaking) this.onSpeakingChange(false, this.peerId!);
        this.microphone.speaking = false;
      }
    }
  }

  /**
   * Get the amplitude of the given peer's stream.
   */
  public getAmplitude(peerId: string): number | null {
    const callIndex = this.calls.findIndex(c => c.connection.peer === peerId);

    if (callIndex === -1) return null;
    if (this.calls[callIndex].analyser === null) return null;

    return this.getAnalyserAmplitude(this.calls[callIndex].analyser!);
  }

  /**
   * Get the amplitude of the given analyser node.
   */
  public getAnalyserAmplitude(analyser: AnalyserNode): number {
    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(data);

    let sumOfSquares = 0;
    for (let i = 0; i < data.length; i++) {
      // eslint-disable-next-line
      sumOfSquares += data[i] * data[i];
    }

    return Math.sqrt(sumOfSquares / data.length);
  }

  /**
   * Connects the current user to the given voice channel.
   */
  public connectToVoiceChannel(token: string, channel: string) {
    this.audioContext.resume();
    this.ws.send(JSON.stringify({
      command: "v1/connectToVoiceChannel",
      token,
      channel
    }));
  }

  /**
   * Disconnects the current user from the voice channel.
   */
  public leaveVoiceChannel(token: string) {
    this.ws.send(JSON.stringify({
      command: "v1/leaveVoiceChannel",
      token
    }));
  }

  /**
   * Connects the current user to every peer in the list.
   */
  public async connectToPeers(peers: string[]) {
    for (const peer of peers) {
      const call = this.peer.call(peer, this.microphone!.outputStream.stream, {
        metadata: {
          mode: "voice"
        }
      });

      this.calls.push({
        connection: call,
        stream: null,
        analyser: null,
        gain: null,
        speaking: false
      });

      call.on("stream", remoteStream => this.initStream(remoteStream, call.peer));
    }
  }

  /**
   * Disconnects the current user from every peer.
   */
  public disconnect() {
    for (const call of this.calls) {
      call.connection.close();
    }

    for (const screenshare of this.screenshares) {
      screenshare.connection.close();
    }

    for (const outboundScreenshare of this.outboundScreenshares) {
      outboundScreenshare.connection.close();
    }

    if (this.screenshare) {
      for (const track of this.screenshare!.getTracks()) {
        track.stop();
      }

      this.screenshare = undefined;
    }

    this.calls = [];
    this.screenshares = [];
    this.outboundScreenshares = [];
  }

  /**
   * Disconnects the current user from the given peer, if they are connected.
   */
  public disconnectPeer(peerId: string) {
    const callIndex = this.calls.findIndex(c => c.connection.peer === peerId);

    if (callIndex !== -1) {
      this.calls[callIndex].connection.close();
      this.calls.splice(callIndex, 1);
    }

    const screenshareIndex = this.screenshares.findIndex(c => c.connection.peer === peerId);

    if (screenshareIndex !== -1) {
      this.screenshares[screenshareIndex].connection.close();
      this.screenshares.splice(screenshareIndex, 1);
    }

    const outboundScreenshareIndex = this.outboundScreenshares.findIndex(c => c.connection.peer === peerId);

    if (outboundScreenshareIndex !== -1) {
      this.outboundScreenshares[outboundScreenshareIndex].connection.close();
      this.outboundScreenshares.splice(outboundScreenshareIndex, 1);
    }
  }

  /**
   * Starts sharing the screen with every connected peer.
   */
  public async shareScreen() {
    const stream = await this.getScreenshareStream();

    stream.getVideoTracks()[0].onended = this.stopSharingScreen.bind(this);

    this.screenshare = stream;

    this.onNewScreenshare(this.peerId!, stream);

    this.userStartScreenshareAudio.load();
    this.userStartScreenshareAudio.play();

    for (const call of this.calls) {
      const peer = call.connection.peer;

      const screenshare = this.peer.call(peer, this.screenshare, {
        metadata: {
          mode: "screenshare",
          initial: true
        }
      });

      this.outboundScreenshares.push({
        connection: screenshare,
        stream: null,
      });
    }
  }

  /**
   * Stops sharing the screen.
   */
  public async stopSharingScreen() {
    if (this.screenshare) {
      for (const track of this.screenshare!.getTracks()) {
        track.stop();
      }

      this.screenshare = undefined;
    }

    this.onEndScreenshare(this.peerId!);

    this.userEndScreenshareAudio.load();
    this.userEndScreenshareAudio.play();

    for (const screenshare of this.outboundScreenshares) {
      screenshare.connection.close();
    }
  }

  /**
   * Plays the "join" audio sound.
   */
  public playJoinAudio() {
    this.userJoinAudio.load();
    this.userJoinAudio.play();
  }

  /**
   * Plays the "leave" audio sound.
   */
  public playLeaveAudio() {
    this.userLeaveAudio.load();
    this.userLeaveAudio.play();
  }
}

export default Voice;