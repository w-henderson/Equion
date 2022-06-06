import React from "react";
import ApiContext from "../api/ApiContext";
import { open } from "@tauri-apps/api/dialog";
import "../styles/MessageBox.scss";

import { Paperclip } from "./Svg";

interface MessageBoxProps {
  subsetId: string,
  members: UserData[],
  sendCallback: () => void
}

interface MessageBoxState {
  message: string,
  mentioning?: {
    query: string,
    highlighted: number
  },
  mentions: UserData[],
  attachment?: string,
  sending: boolean
}

/**
 * Component for the message box.
 */
class MessageBox extends React.Component<MessageBoxProps, MessageBoxState> {
  context!: React.ContextType<typeof ApiContext>;
  box: React.RefObject<HTMLTextAreaElement>;
  lastTypingPing = 0;

  /**
   * Initializes the component.
   */
  constructor(props: MessageBoxProps) {
    super(props);

    this.state = {
      mentions: [],
      mentioning: undefined,
      message: "",
      attachment: undefined,
      sending: false
    };

    this.box = React.createRef();

    this.addAttachment = this.addAttachment.bind(this);
    this.handleButtonPress = this.handleButtonPress.bind(this);
    this.changeHighlight = this.changeHighlight.bind(this);
    this.addMention = this.addMention.bind(this);
    this.messageChange = this.messageChange.bind(this);
    this.messageSend = this.messageSend.bind(this);
  }

  /**
   * When the message box first renders, focus it.
   * 
   * This causes the box to be focussed whenever the subset is changed.
   */
  componentDidMount() {
    if (this.box.current) {
      this.box.current.focus();
    }
  }

  /**
   * Adds an attachment to the message.
   */
  addAttachment() {
    open({
      title: "Attach a file",
      multiple: false,
    }).then(path => {
      if (!Array.isArray(path) && path) {
        this.setState({ attachment: path });
      }
    });
  }

  /**
   * Handles keyboard events for pinging people.
   */
  handleButtonPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (this.state.mentioning !== undefined) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.changeHighlight(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.changeHighlight(1);
      } else if (e.key === "Tab") {
        e.preventDefault();
        this.addMention();
      }
    }

    if (
      this.box.current &&
      e.key === "Backspace" &&
      (this.state.message.length === 0 ||
        (this.box.current.selectionStart === 0 &&
          this.box.current.selectionEnd === this.state.message.length))
    ) {
      this.setState(state => {
        return {
          ...state,
          mentions: state.mentions.slice(0, state.mentions.length - 1)
        };
      });
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.messageSend();
    }
  }

  /**
   * Changes the highlighted user in the given direction.
   */
  changeHighlight(direction: number) {
    if (this.state.mentioning) {
      const mentioning = this.state.mentioning;
      let newIndex = this.state.mentioning.highlighted + direction;

      const length = this.props.members.filter(user =>
        user.displayName.toLowerCase().includes(mentioning.query.toLowerCase())
        || user.username.toLowerCase().includes(mentioning.query.toLowerCase())
      ).length;

      if (newIndex < 0) {
        newIndex = length - 1;
      } else if (newIndex >= length) {
        newIndex = 0;
      }

      this.setState({
        mentioning: {
          ...mentioning,
          highlighted: newIndex
        }
      });
    }
  }

  /**
   * Adds the highlighted mention to the message.
   */
  addMention() {
    if (!this.state.mentioning || !this.box.current) return;

    const mentioning = this.state.mentioning;

    const user = this.props.members.filter(user =>
      user.displayName.toLowerCase().includes(mentioning.query.toLowerCase())
      || user.username.toLowerCase().includes(mentioning.query.toLowerCase())
    )[mentioning.highlighted];

    const words = this.state.message.split(" ");
    let currentPosition = this.box.current.selectionStart || 0;
    let currentWordIndex = 0;

    for (const word of words) {
      currentPosition -= word.length + 1;
      if (currentPosition < 0) break;
      currentWordIndex++;
    }

    words.splice(currentWordIndex, 1);

    this.setState(state => {
      return {
        ...state,
        message: words.join(" "),
        mentions: [...state.mentions, user],
      };
    });
  }

  /**
   * Handles changes to the message.
   * 
   * This keeps track of the current word to enable mentioning.
   */
  messageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const timestamp = new Date().getTime();

    if (timestamp - this.lastTypingPing > 1000 && e.target.value !== this.state.message) {
      this.lastTypingPing = timestamp;
      this.context!.setTyping(this.props.subsetId);
    }

    const words = e.target.value.split(" ");
    let currentPosition = e.target.selectionStart || 0;
    let currentWordIndex = 0;

    for (const word of words) {
      currentPosition -= word.length + 1;
      if (currentPosition < 0) break;
      currentWordIndex++;
    }

    const currentWord = words[currentWordIndex];

    if (currentWord.startsWith("@")) {
      this.setState({
        mentioning: {
          query: currentWord.substring(1),
          highlighted: 0
        },
        message: e.target.value
      });
    } else {
      this.setState({
        mentioning: undefined,
        message: e.target.value
      });
    }
  }

  /**
   * Sends the message.
   */
  messageSend() {
    const formattedMentions = this.state.mentions.map(user => "<@" + user.uid + ">").join(" ");
    const message = (formattedMentions + " " + this.state.message).trim();
    const attachment = this.state.attachment;

    if (message.length > 0 || attachment) {
      this.setState({
        message: "",
        mentioning: undefined,
        mentions: [],
        attachment: undefined,
        sending: true
      }, () => {
        this.props.sendCallback();
        this.context!.sendMessage(this.props.subsetId, message, attachment).then(() => {
          this.setState({ sending: false }, () => {
            this.box.current?.focus();
          });
        });
      });
    }
  }

  /**
   * Renders the message box.
   */
  render() {
    const attachmentName = this.state.attachment?.split("\\").pop()?.split("/").pop();

    return (
      <div className="MessageBox">
        <div
          className="attachButton"
          onClick={this.addAttachment}>
          +
        </div>

        <form>
          <div className="mentions">
            {this.state.mentions.map(user => (
              <div className="mention" key={user.uid}>
                {`@${user.displayName}`}
              </div>
            ))}
          </div>

          <textarea
            value={this.state.message}
            onChange={this.messageChange}
            onKeyDown={this.handleButtonPress}
            onSelect={this.messageChange}
            placeholder={this.state.sending ? "Sending..." : "Type a message"}
            disabled={this.state.sending}
            style={{ height: `${this.state.message.split("\n").length * 18 + 4}px` }}
            ref={this.box} />
        </form>

        <div className={this.state.attachment === undefined ? "attachDialog hidden" : "attachDialog"}>
          <Paperclip />

          <div className="text">
            <span>{attachmentName || "Nothing"}</span>
            <span>is attached to this message</span>
          </div>

          <div
            className="x"
            onClick={() => this.setState({ attachment: undefined })}>
            x
          </div>
        </div>

        {this.state.mentioning !== undefined &&
          <div className="pingDialog">
            <div className="title">
              <h2>Members matching <span>@{this.state.mentioning.query}</span></h2>
            </div>

            <div className="matches">
              {this.props.members.filter(user =>
                this.state.mentioning && (
                  user.displayName.toLowerCase().includes(this.state.mentioning.query.toLowerCase())
                  || user.username.toLowerCase().includes(this.state.mentioning.query.toLowerCase()))
              ).map((user, i) => (
                <div className={i === this.state.mentioning?.highlighted ? "match highlighted" : "match"} key={user.uid}>
                  <img src={this.context!.getFileURL(user.image)} alt="Member" />

                  <div>
                    <h2>{user.displayName}</h2>
                    <span>@{user.username}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      </div>
    );
  }
}

MessageBox.contextType = ApiContext;

export default MessageBox;