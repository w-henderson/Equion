import React from 'react';
import ApiContext from '../api/ApiContext';
import '../styles/MessageBox.scss';

interface MessageBoxProps {
  subsetId: string
}

interface MessageBoxState {
  message: string,
  sending: boolean
}

class MessageBox extends React.Component<MessageBoxProps, MessageBoxState> {
  context!: React.ContextType<typeof ApiContext>;
  box: React.RefObject<HTMLInputElement>;

  constructor(props: MessageBoxProps) {
    super(props);

    this.state = {
      message: "",
      sending: false
    }

    this.box = React.createRef();
    this.messageChange = this.messageChange.bind(this);
    this.messageSend = this.messageSend.bind(this);
  }

  componentDidUpdate() {
    if (this.box.current) {
      this.box.current.focus();
    }
  }

  messageChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      message: e.target.value
    });
  }

  messageSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let message = this.state.message;

    if (message.length > 0) {
      this.setState({
        message: "",
        sending: true
      }, () => {
        this.context.sendMessage(this.props.subsetId, message).then(() => {
          this.setState({ sending: false }, () => {
            this.box.current!.focus();
          });
        })
      });

    }

  }

  render() {
    return (
      <div className="MessageBox">
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
      </div>
    )
  }
}

MessageBox.contextType = ApiContext;

export default MessageBox;