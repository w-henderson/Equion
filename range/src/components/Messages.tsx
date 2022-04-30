import React from 'react';
import '../styles/Messages.scss';

import Message from "./Message";
import MessageBox from './MessageBox';

interface MessagesProps {
  subset: SubsetData | undefined
}

class Messages extends React.Component<MessagesProps> {
  render() {
    if (this.props.subset !== undefined) {
      return (
        <div className="Messages">
          <div data-tauri-drag-region className="title">
            <h1>{this.props.subset.name}</h1>
          </div>

          <div className="messageList">
            {(this.props.subset.messages || []).map(message =>
              <Message message={message} key={message.id} />
            )}
          </div>

          <MessageBox />
        </div>
      )
    } else {
      return (
        <div className="Messages">
          <div data-tauri-drag-region className="title">
            <h1></h1>
          </div>
        </div>
      )
    }
  }
}

export default Messages;