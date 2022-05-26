import React from "react";
import ApiContext from "../api/ApiContext";

interface VoiceMemberProps {
  member: VoiceUserData,
  inVoiceChat: boolean
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

    if (this.props.member.user.uid !== this.context.uid) {
      this.context.voice.setVolume(this.props.member.peerId, e.target.value);
    } else {
      this.context.voice.setMicrophoneVolume(e.target.value);
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
        className={this.props.member.speaking === true ? "member speaking" : "member"}
        ref={this.wrapperRef}
        onClick={() => {
          if (!this.state.optionsVisible && this.props.inVoiceChat) {
            this.showOptions();
          }
        }}>

        <img src={this.context.getFileURL(this.props.member.user.image)} alt="User" />
        <h2>{this.props.member.user.displayName}</h2>

        {this.state.optionsVisible &&
          <div
            className="voiceOptions"
            ref={this.optionsRef}
            style={{
              top: y + "px",
              left: x + "px",
            }}>

            {this.props.member.user.uid === this.context.uid &&
              <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 14V6M14 14L20.1023 17.487C20.5023 17.7156 21 17.4268 21 16.9661V3.03391C21 2.57321 20.5023 2.28439 20.1023 2.51296L14 6M14 14H7C4.79086 14 3 12.2091 3 10V10C3 7.79086 4.79086 6 7 6H14" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7.75716 19.3001L7 14H11L11.6772 18.7401C11.8476 19.9329 10.922 21 9.71716 21C8.73186 21 7.8965 20.2755 7.75716 19.3001Z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            }

            {this.props.member.user.uid !== this.context.uid &&
              <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 14V10C2 9.44772 2.44772 9 3 9H5.69722C5.89465 9 6.08766 8.94156 6.25192 8.83205L10.4453 6.03647C11.1099 5.59343 12 6.06982 12 6.86852V17.1315C12 17.9302 11.1099 18.4066 10.4453 17.9635L6.25192 15.1679C6.08766 15.0584 5.89465 15 5.69722 15H3C2.44772 15 2 14.5523 2 14Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16.5 7.5C16.5 7.5 18 9 18 11.5C18 14 16.5 15.5 16.5 15.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19.5 4.5C19.5 4.5 22 7 22 11.5C22 16 19.5 18.5 19.5 18.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }

            <input
              type="range"
              min={0}
              max={2}
              defaultValue={1}
              step={0.01}
              value={this.state.volume}
              onChange={this.volumeChange} />
          </div>
        }
      </div>
    );
  }
}

VoiceMember.contextType = ApiContext;

export default VoiceMember;