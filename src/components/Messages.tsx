import React from 'react';
import '../styles/Messages.scss';

import Message from "./Message";

interface MessagesProps {
  subset: SubsetData
}

interface MessagesState {
  messages: MessageData[]
}

class Messages extends React.Component<MessagesProps, MessagesState> {
  constructor(props: MessagesProps) {
    super(props);

    this.state = {
      messages: [
        {
          id: "1",
          author: {
            id: "1",
            name: "Unknown User",
            image: "https://cdn.landesa.org/wp-content/uploads/default-user-image.png"
          },
          text: "An extremely long message goes here which will have to wrap around!",
          timestamp: 1651003806648
        },
        {
          id: "2",
          author: {
            id: "12345678-9abc-def0-1234-56789abcdef0",
            name: "William Henderson",
            image: "https://avatars.githubusercontent.com/u/58106291"
          },
          text: "Hi from me!",
          timestamp: 1651003806648
        }
      ]
    };
  }

  render() {
    return (
      <div className="Messages">
        <div data-tauri-drag-region className="title">
          <h1>{this.props.subset.name}</h1>
        </div>

        <div className="messageList">
          {this.state.messages.map(message =>
            <Message message={message} key={message.id} />
          )}
        </div>
      </div>
    )
  }
}

export default Messages;