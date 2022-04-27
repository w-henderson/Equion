import React from 'react';
import '../styles/MessageBox.scss';

interface MessageBoxState {
  message: string
}

class MessageBox extends React.Component<{}, MessageBoxState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      message: ""
    }

    this.messageChange = this.messageChange.bind(this);
    this.messageSend = this.messageSend.bind(this);
  }

  messageChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      message: e.target.value
    });
  }

  messageSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let message = this.state.message;

    this.setState({ message: "" });
  }

  render() {
    return (
      <div className="MessageBox">
        <form onSubmit={this.messageSend}>
          <input
            type="text"
            value={this.state.message}
            onChange={this.messageChange}
            placeholder="Type a message" />

          <input hidden type="submit" />
        </form>
      </div>
    )
  }
}

export default MessageBox;