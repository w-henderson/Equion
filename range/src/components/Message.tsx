import React from 'react';
import '../styles/Message.scss';

import ApiContext from '../api/ApiContext';

interface MessageProps {
  message: MessageData
}

class Message extends React.Component<MessageProps> {
  context!: React.ContextType<typeof ApiContext>;

  render() {
    let sendDate = new Date(this.props.message.timestamp);
    let sendDateString = sendDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let isLocalSender = this.props.message.author.id === this.context.getUid();

    return (
      <div className={isLocalSender ? "Message local" : "Message"}>
        <img src={this.props.message.author.image} alt="Profile" />

        <div className="content">
          <div className="meta">
            <span className="name">{this.props.message.author.name}</span>
            <span className="date">{sendDateString}</span>
          </div>

          <div className="text">
            {this.props.message.text}
          </div>
        </div>
      </div>
    )
  }
}

Message.contextType = ApiContext;

export default Message;