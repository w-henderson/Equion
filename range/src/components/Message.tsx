import React from 'react';
import '../styles/Message.scss';

import ApiContext from '../api/ApiContext';
import { MathJax } from 'better-react-mathjax';

interface MessageProps {
  message: MessageData,
  scrollCallback: () => void,
  showUserCallback: (id: string) => void,
}

class Message extends React.Component<MessageProps> {
  context!: React.ContextType<typeof ApiContext>;

  render() {
    let sendDate = new Date(this.props.message.timestamp);
    let sendDateString = sendDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let isLocalSender = this.props.message.author.id === this.context.getUid();

    return (
      <div className={isLocalSender ? "Message local" : "Message"}>
        <img
          src={this.props.message.author.image}
          alt="Profile"
          onClick={() => this.props.showUserCallback(this.props.message.author.id)} />

        <div className="content">
          <div className="meta">
            <span className="name">{this.props.message.author.displayName}</span>
            <span className="date">{sendDateString}</span>
          </div>

          <div className="text">
            <MathJax onTypeset={this.props.scrollCallback}>
              {this.props.message.text}
            </MathJax>
          </div>
        </div>
      </div>
    )
  }
}

Message.contextType = ApiContext;

export default Message;