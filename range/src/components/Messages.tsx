import React from 'react';
import '../styles/Messages.scss';

import Message from "./Message";
import MessageBox from './MessageBox';

interface MessagesProps {
  subset: SubsetData | undefined,
  requestMoreMessages: () => Promise<void>,
}

class Messages extends React.Component<MessagesProps> {
  messages: React.RefObject<HTMLDivElement>;
  lastId: string | null;

  constructor(props: MessagesProps) {
    super(props);

    this.lastId = null;

    this.handleScroll = this.handleScroll.bind(this);
    this.messages = React.createRef();
  }

  componentDidMount() {
    if (this.messages.current) {
      this.messages.current.scrollTop = this.messages.current.scrollHeight;
    }
  }

  handleScroll() {
    if (this.messages.current!.scrollTop === 0) {
      let oldScrollHeight = this.messages.current!.scrollHeight;
      this.props.requestMoreMessages().then(() => {
        let newScrollHeight = this.messages.current!.scrollHeight;
        this.messages.current!.scrollTop = newScrollHeight - oldScrollHeight;
      });
    }
  }

  componentDidUpdate() {
    if (this.props.subset !== undefined && this.props.subset.id !== this.lastId) {
      this.lastId = this.props.subset.id;
      this.messages.current!.scrollTop = this.messages.current!.scrollHeight;
    }
  }

  render() {
    if (this.props.subset !== undefined) {
      return (
        <div className="Messages">
          <div data-tauri-drag-region className="title">
            <h1>{this.props.subset.name}</h1>
          </div>

          <div className="messageList" ref={this.messages} onScroll={this.handleScroll}>
            {this.props.subset.loadedToTop &&
              <p>That's all the messages we have.</p>
            }

            {!this.props.subset.loadedToTop &&
              <p>Loading more messages...</p>
            }

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