import React from "react";
import ApiContext from "../../api/ApiContext";
import "../../styles/voice/Voice.scss";

import VoiceMember from "./VoiceMember";
import Screenshare from "./Screenshare";
import { MuteIcon, VoiceChatIcon, MicrophoneIcon } from "../Svg";

interface VoiceProps {
  id: string,
  members: VoiceUserData[]
}

interface VoiceState {
  screenshare: {
    stream: MediaStream,
    peerId: string
  } | null,
  microphoneVolume: number,
  muted: boolean
}

/**
 * Component for the voice chat.
 */
class Voice extends React.Component<VoiceProps, VoiceState> {
  context!: React.ContextType<typeof ApiContext>;

  /**
   * Initializes the component.
   */
  constructor(props: VoiceProps) {
    super(props);

    this.state = {
      screenshare: null,
      microphoneVolume: 1,
      muted: false
    };

    this.joinVoice = this.joinVoice.bind(this);
    this.leaveVoice = this.leaveVoice.bind(this);
    this.changeMicrophoneVolume = this.changeMicrophoneVolume.bind(this);
    this.mute = this.mute.bind(this);
    this.unmute = this.unmute.bind(this);
  }

  /**
   * Ensures that the stream is no longer displayed when the stream is closed.
   */
  componentDidUpdate() {
    if (this.state.screenshare && !this.props.members.some(m => m.peerId === this.state.screenshare!.peerId && m.screenshare !== undefined)) {
      this.setState({ screenshare: null });
    }
  }

  /**
   * Joins the voice chat.
   */
  joinVoice() {
    if (!this.context!.token) return;

    this.context!.voice.connectToVoiceChannel(this.props.id);
  }

  /**
   * Leaves the voice chat.
   */
  leaveVoice() {
    if (!this.context!.token) return;

    this.context!.voice.leaveVoiceChannel();
  }

  /**
   * Changes the microphone volume.
   */
  changeMicrophoneVolume(volume: number) {
    if (!this.context!.token) return;

    this.setState({ microphoneVolume: volume }, () => {
      if (!this.state.muted) this.context!.voice.setMicrophoneVolume(volume);
    });
  }

  /**
   * Mutes the microphone.
   */
  mute() {
    if (!this.context!.token) return;

    this.context!.voice.setMicrophoneVolume(0);

    this.setState({ muted: true });
  }

  /**
   * Unmutes the microphone.
   */
  unmute() {
    if (!this.context!.token) return;

    this.context!.voice.setMicrophoneVolume(this.state.microphoneVolume);

    this.setState({ muted: false });
  }

  /**
   * Renders the component.
   */
  render() {
    const inVoiceChat = this.context!.voice.currentChannel === this.props.id;

    return (
      <div className="Voice">
        <div className="voiceButtons">
          <div className="Subset voice" onClick={inVoiceChat ? this.leaveVoice : this.joinVoice}>
            <VoiceChatIcon />

            <span>
              {inVoiceChat ? "Leave Voice" : "Join Voice"}
            </span>
          </div>

          <div className="Subset voice muteButton" onClick={this.state.muted ? this.unmute : this.mute}>
            {this.state.muted ? <MuteIcon /> : <MicrophoneIcon />}
          </div>
        </div>

        {this.props.members.length > 0 &&
          <div className={inVoiceChat ? "voiceMembers inVoiceChat" : "voiceMembers"}>
            {this.props.members.map(member =>
              <VoiceMember
                member={member}
                inVoiceChat={inVoiceChat}
                isLocalUser={member.user.uid === this.context!.uid}
                microphoneVolume={this.state.microphoneVolume}
                changeMicrophoneVolume={this.changeMicrophoneVolume}
                startScreenShareCallback={() => this.context!.voice.shareScreen()}
                stopScreenShareCallback={() => this.context!.voice.stopSharingScreen()}
                watchScreenShareCallback={() => this.setState({
                  screenshare: {
                    stream: member.screenshare!,
                    peerId: member.peerId
                  }
                })}
                key={member.peerId} />
            )}
          </div>
        }

        {this.props.members.length === 0 &&
          <span className="none">Nobody's in the voice channel yet.</span>
        }

        <Screenshare
          stream={this.state.screenshare?.stream ?? null}
          close={() => this.setState({ screenshare: null })} />
      </div>
    );
  }
}

Voice.contextType = ApiContext;

export default Voice;