import React from "react";
import ApiContext from "../api/ApiContext";
import { MicrophoneIcon, ScreenshareIcon, VolumeIcon } from "./Svg";

interface VoiceMemberProps {
  member: VoiceUserData,
  inVoiceChat: boolean,
  startScreenShareCallback: () => void,
  stopScreenShareCallback: () => void,
  watchScreenShareCallback: () => void,
}

interface VoiceMemberState {
  optionsVisible: boolean,
  volume: number
}

/**
 * Component for each individual member of the voice chat.
 * 
 * This manages the UI for the volume of each member, as well as if they are speaking.
 */
class VoiceMember extends React.Component<VoiceMemberProps, VoiceMemberState> {
  context!: React.ContextType<typeof ApiContext>;
  wrapperRef: React.RefObject<HTMLDivElement>;
  optionsRef: React.RefObject<HTMLDivElement>;

  /**
   * Initializes the component.
   */
  constructor(props: VoiceMemberProps) {
    super(props);

    this.state = {
      optionsVisible: false,
      volume: 1
    };

    this.wrapperRef = React.createRef();
    this.optionsRef = React.createRef();

    this.showOptions = this.showOptions.bind(this);
    this.hideOptions = this.hideOptions.bind(this);
    this.volumeChange = this.volumeChange.bind(this);
  }

  /**
   * If the user is no longer in the voice chat but the options for the user are still visible, hide them.
   */
  componentDidUpdate() {
    if (this.state.optionsVisible && !this.props.inVoiceChat) {
      this.setState({ optionsVisible: false }, () => {
        document.removeEventListener("mousedown", this.hideOptions);
      });
    }
  }

  /**
   * Show the options for the user.
   */
  showOptions() {
    this.setState({ optionsVisible: true }, () => {
      document.addEventListener("mousedown", this.hideOptions);
    });
  }

  /**
   * Hide the options for the user.
   */
  /* eslint-disable */
  hideOptions(e: any) {
    if (this.optionsRef.current && !this.optionsRef.current.contains(e.target)) {
      this.setState({ optionsVisible: false }, () => {
        document.removeEventListener("mousedown", this.hideOptions);
      });
    }
  }

  /**
   * Change the volume of the user.
   */
  volumeChange(e: any) {
    this.setState({ volume: e.target.value });

    if (this.props.member.user.uid !== this.context!.uid) {
      this.context!.voice.setVolume(this.props.member.peerId, e.target.value);
    } else {
      this.context!.voice.setMicrophoneVolume(e.target.value);
    }
  }

  /**
   * Render the component.
   */
  render() {
    const x = (this.wrapperRef.current?.offsetLeft ?? 0) + 231;
    const y = (this.wrapperRef.current?.offsetTop ?? 0);

    return (
      <div
        className={this.props.member.speaking === true && this.props.inVoiceChat ? "member speaking" : "member"}
        ref={this.wrapperRef}
        onClick={() => {
          if (!this.state.optionsVisible && this.props.inVoiceChat) {
            this.showOptions();
          }
        }}>

        <img src={this.context!.getFileURL(this.props.member.user.image)} alt="User" />
        <h2>{this.props.member.user.displayName}</h2>

        {this.props.member.screenshare !== undefined &&
          <ScreenshareIcon />
        }

        {this.state.optionsVisible &&
          <div
            className="voiceOptions"
            ref={this.optionsRef}
            style={{
              top: y + "px",
              left: x + "px",
            }}>

            <div className="volume">
              {this.props.member.user.uid === this.context!.uid &&
                <MicrophoneIcon />
              }

              {this.props.member.user.uid !== this.context!.uid &&
                <VolumeIcon />
              }

              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={this.state.volume}
                onChange={this.volumeChange} />
            </div>

            <div className="screenshareControls">
              {this.props.member.user.uid === this.context!.uid && this.props.member.screenshare === undefined &&
                <button onClick={this.props.startScreenShareCallback}>Start Screen Share</button>
              }

              {this.props.member.user.uid === this.context!.uid && this.props.member.screenshare !== undefined &&
                <button onClick={this.props.stopScreenShareCallback}>Stop Screen Share</button>
              }

              {this.props.member.user.uid !== this.context!.uid && this.props.member.screenshare !== undefined &&
                <button onClick={this.props.watchScreenShareCallback}>Watch Screen Share</button>
              }
            </div>
          </div>
        }
      </div>
    );
  }
}

VoiceMember.contextType = ApiContext;

export default VoiceMember;