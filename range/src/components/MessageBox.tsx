import React from 'react';
import ApiContext from '../api/ApiContext';
import { open } from '@tauri-apps/api/dialog';
import '../styles/MessageBox.scss';

interface MessageBoxProps {
  subsetId: string
}

interface MessageBoxState {
  message: string,
  attachment?: string,
  sending: boolean
}

class MessageBox extends React.Component<MessageBoxProps, MessageBoxState> {
  context!: React.ContextType<typeof ApiContext>;
  box: React.RefObject<HTMLInputElement>;

  constructor(props: MessageBoxProps) {
    super(props);

    this.state = {
      message: "",
      attachment: undefined,
      sending: false
    }

    this.box = React.createRef();

    this.addAttachment = this.addAttachment.bind(this);
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
      if (!Array.isArray(path)) {
        this.setState({ attachment: path });
      }
    })
  }

  messageChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      message: e.target.value
    });
  }

  messageSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let message = this.state.message;
    let attachment = this.state.attachment;

    if (message.length > 0) {
      this.setState({
        message: "",
        attachment: undefined,
        sending: true
      }, () => {
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
          <input
            type="text"
            value={this.state.message}
            onChange={this.messageChange}
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
      </div>
    )
  }
}

MessageBox.contextType = ApiContext;

export default MessageBox;