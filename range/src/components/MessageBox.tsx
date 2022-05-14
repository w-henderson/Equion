import React from 'react';
import ApiContext from '../api/ApiContext';
import { open } from '@tauri-apps/api/dialog';
import '../styles/MessageBox.scss';

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

class MessageBox extends React.Component<MessageBoxProps, MessageBoxState> {
  context!: React.ContextType<typeof ApiContext>;
  box: React.RefObject<HTMLInputElement>;

  constructor(props: MessageBoxProps) {
    super(props);

    this.state = {
      mentions: [],
      mentioning: undefined,
      message: "",
      attachment: undefined,
      sending: false
    }

    this.box = React.createRef();

    this.addAttachment = this.addAttachment.bind(this);
    this.handleButtonPress = this.handleButtonPress.bind(this);
    this.changeHighlight = this.changeHighlight.bind(this);
    this.addMention = this.addMention.bind(this);
    this.messageChange = this.messageChange.bind(this);
    this.messageSend = this.messageSend.bind(this);
  }

  componentDidUpdate() {
    if (this.box.current) {
      this.box.current.focus();
    }
  }

  addAttachment() {
    open({
      title: "Attach a file",
      multiple: false,
    }).then(path => {
      if (!Array.isArray(path) && path) {
        this.setState({ attachment: path });
      }
    })
  }

  handleButtonPress(e: React.KeyboardEvent<HTMLInputElement>) {
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
      e.key === "Backspace" &&
      (this.state.message.length === 0 ||
        (this.box.current!.selectionStart === 0 &&
          this.box.current!.selectionEnd === this.state.message.length))
    ) {
      this.setState(state => {
        return {
          ...state,
          mentions: state.mentions.slice(0, state.mentions.length - 1)
        }
      })
    }
  }

  changeHighlight(direction: number) {
    let currentIndex = this.state.mentioning?.highlighted;

    if (currentIndex !== undefined) {
      let newIndex = currentIndex + direction;
      let length = this.props.members.filter(user =>
        user.displayName.toLowerCase().includes(this.state.mentioning!.query.toLowerCase())
        || user.username.toLowerCase().includes(this.state.mentioning!.query.toLowerCase())
      ).length;

      if (newIndex < 0) {
        newIndex = length - 1;
      } else if (newIndex >= length) {
        newIndex = 0;
      }

      this.setState({
        mentioning: {
          ...this.state.mentioning!,
          highlighted: newIndex
        }
      })
    }
  }

  addMention() {
    let user = this.props.members.filter(user =>
      user.displayName.toLowerCase().includes(this.state.mentioning!.query.toLowerCase())
      || user.username.toLowerCase().includes(this.state.mentioning!.query.toLowerCase())
    )[this.state.mentioning!.highlighted];

    let words = this.state.message.split(" ");
    let currentPosition = this.box.current!.selectionStart || 0;
    let currentWordIndex = 0;

    for (let word of words) {
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
      }
    })
  }

  messageChange(e: React.ChangeEvent<HTMLInputElement>) {
    let words = e.target.value.split(" ");
    let currentPosition = e.target.selectionStart || 0;
    let currentWordIndex = 0;

    for (let word of words) {
      currentPosition -= word.length + 1;
      if (currentPosition < 0) break;
      currentWordIndex++;
    }

    let currentWord = words[currentWordIndex];

    if (currentWord.startsWith("@")) {
      this.setState({
        mentioning: {
          query: currentWord.substring(1),
          highlighted: 0
        },
        message: e.target.value
      })
    } else {
      this.setState({
        mentioning: undefined,
        message: e.target.value
      })
    }
  }

  messageSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let formattedMentions = this.state.mentions.map(user => "<@" + user.uid + ">").join(" ");
    let message = (formattedMentions + " " + this.state.message).trim();
    let attachment = this.state.attachment;

    if (message.length > 0 || attachment) {
      this.setState({
        message: "",
        mentioning: undefined,
        mentions: [],
        attachment: undefined,
        sending: true
      }, () => {
        this.props.sendCallback();
        this.context.sendMessage(this.props.subsetId, message, attachment).then(() => {
          this.setState({ sending: false }, () => {
            this.box.current!.focus();
          });
        })
      });
    }
  }

  render() {
    let attachmentName = this.state.attachment?.split('\\').pop()?.split('/').pop();;

    return (
      <div className="MessageBox">
        <div
          className="attachButton"
          onClick={this.addAttachment}>
          +
        </div>

        <form onSubmit={this.messageSend}>
          <div className="mentions">
            {this.state.mentions.map(user => (
              <div className="mention" key={user.uid}>
                {`@${user.displayName}`}
              </div>
            ))}
          </div>

          <input
            type="text"
            value={this.state.message}
            onChange={this.messageChange}
            onKeyDown={this.handleButtonPress}
            onSelect={this.messageChange}
            placeholder={this.state.sending ? "Sending..." : "Type a message"}
            disabled={this.state.sending}
            ref={this.box} />

          <input hidden type="submit" />
        </form>

        <div className={this.state.attachment === undefined ? "attachDialog hidden" : "attachDialog"}>
          <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.4383 11.6622L12.2483 20.8522C11.1225 21.9781 9.59552 22.6106 8.00334 22.6106C6.41115 22.6106 4.88418 21.9781 3.75834 20.8522C2.63249 19.7264 2 18.1994 2 16.6072C2 15.015 2.63249 13.4881 3.75834 12.3622L12.9483 3.17222C13.6989 2.42166 14.7169 2 15.7783 2C16.8398 2 17.8578 2.42166 18.6083 3.17222C19.3589 3.92279 19.7806 4.94077 19.7806 6.00222C19.7806 7.06368 19.3589 8.08166 18.6083 8.83222L9.40834 18.0222C9.03306 18.3975 8.52406 18.6083 7.99334 18.6083C7.46261 18.6083 6.95362 18.3975 6.57834 18.0222C6.20306 17.6469 5.99222 17.138 5.99222 16.6072C5.99222 16.0765 6.20306 15.5675 6.57834 15.1922L15.0683 6.71222" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

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
                user.displayName.toLowerCase().includes(this.state.mentioning!.query.toLowerCase())
                || user.username.toLowerCase().includes(this.state.mentioning!.query.toLowerCase())
              ).map((user, i) => (
                <div className={i === this.state.mentioning!.highlighted ? "match highlighted" : "match"} key={user.uid}>
                  <img src={this.context.getFileURL(user.image)} alt="Member" />

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
    )
  }
}

MessageBox.contextType = ApiContext;

export default MessageBox;