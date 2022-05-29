import React from "react";
import ApiContext from "../api/ApiContext";
import "../styles/Voice.scss";
import VoiceMember from "./VoiceMember";

interface VoiceProps {
  id: string,
  members: VoiceUserData[]
}

/**
 * Component for the voice chat.
 */
class Voice extends React.Component<VoiceProps> {
  context!: React.ContextType<typeof ApiContext>;

  /**
   * Initializes the component.
   */
  constructor(props: VoiceProps) {
    super(props);

    this.joinVoice = this.joinVoice.bind(this);
    this.leaveVoice = this.leaveVoice.bind(this);
  }

  /**
   * Joins the voice chat.
   */
  joinVoice() {
    if (!this.context!.token) return;

    this.context!.voice.connectToVoiceChannel(this.context!.token, this.props.id);
  }

  /**
   * Leaves the voice chat.
   */
  leaveVoice() {
    if (!this.context!.token) return;

    this.context!.voice.leaveVoiceChannel(this.context!.token);
  }

  /**
   * Renders the component.
   */
  render() {
    const inVoiceChat = this.context!.voice.currentChannel === this.props.id;

    return (
      <div className="Voice">
        <div className="Subset voice" onClick={inVoiceChat ? this.leaveVoice : this.joinVoice}>
          <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L12 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 9L8 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 10L20 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 10L4 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 7L16 17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

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
                key={member.peerId} />
            )}
          </div>
        }

        {this.props.members.length === 0 &&
          <span className="none">Nobody's in the voice channel yet.</span>
        }
      </div>
    );
  }
}

Voice.contextType = ApiContext;

export default Voice;