import React from "react";
import ApiContext from "../../api/ApiContext";
import "../../styles/voice/Voice.scss";

import VoiceMember from "./VoiceMember";
import Screenshare from "./Screenshare";
import { VoiceChatIcon } from "../Svg";

interface VoiceProps {
  id: string,
  members: VoiceUserData[]
}

interface VoiceState {
  screenshare: {
    stream: MediaStream,
    peerId: string
  } | null
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
      screenshare: null
    };

    this.joinVoice = this.joinVoice.bind(this);
    this.leaveVoice = this.leaveVoice.bind(this);
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
   * Renders the component.
   */
  render() {
    const inVoiceChat = this.context!.voice.currentChannel === this.props.id;

    return (
      <div className="Voice">
        <div className="Subset voice" onClick={inVoiceChat ? this.leaveVoice : this.joinVoice}>
          <VoiceChatIcon />

          <span>
            {inVoiceChat ? "Leave Voice Chat" : "Join Voice Chat"}
          </span>
        </div>

        {this.props.members.length > 0 &&
          <div className={inVoiceChat ? "voiceMembers inVoiceChat" : "voiceMembers"}>
            {this.props.members.map(member =>
              <VoiceMember
                member={member}
                inVoiceChat={inVoiceChat}
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