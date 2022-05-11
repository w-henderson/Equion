import React from 'react';
import ApiContext from '../api/ApiContext';
import { open } from '@tauri-apps/api/shell';

import '../styles/Messages.scss';
import '../styles/UserInfo.scss';

import Message from "./Message";
import MessageBox from './MessageBox';
import Modal from './Modal';

interface MessagesProps {
  subset: SubsetData | undefined,
  showUser: (id: string) => void,
  requestMoreMessages: () => Promise<void>,
}

interface MessagesState {
  waitingForMessages: boolean,
  shownAttachment: boolean,
  shownAttachmentId?: string,
}

class Messages extends React.Component<MessagesProps, MessagesState> {
  context!: React.ContextType<typeof ApiContext>;
  messages: React.RefObject<HTMLDivElement>;
  lastId: string | null;
  lastMessageId: string | null;

  constructor(props: MessagesProps) {
    super(props);

    this.state = {
      waitingForMessages: false,
      shownAttachment: false
    }

    this.lastId = null;
    this.lastMessageId = null;

    this.handleScroll = this.handleScroll.bind(this);
    this.showAttachment = this.showAttachment.bind(this);
    this.messages = React.createRef();
  }

  componentDidMount() {
    if (this.messages.current) {
      this.messages.current.scrollTop = this.messages.current.scrollHeight;
    }
  }

  handleScroll(e: React.WheelEvent<HTMLDivElement>) {
    if (e.deltaY < 0 && this.messages.current!.scrollTop === 0 && !this.state.waitingForMessages && !this.props.subset?.loadedToTop) {
      let oldScrollHeight = this.messages.current!.scrollHeight;
      this.setState({ waitingForMessages: true }, () => {
        this.props.requestMoreMessages().then(() => {
          let newScrollHeight = this.messages.current!.scrollHeight;
          this.messages.current!.scrollTop = newScrollHeight - oldScrollHeight;
          this.setState({ waitingForMessages: false });
        });
      });
    }
  }

  showAttachment(id: string) {
    this.setState({
      shownAttachment: true,
      shownAttachmentId: id
    });
  }

  componentDidUpdate() {
    // Scroll to the bottom if the subset has changed
    if (this.props.subset !== undefined && this.props.subset.id !== this.lastId) {
      this.lastId = this.props.subset.id;
      this.messages.current!.scrollTop = this.messages.current!.scrollHeight;
    }

    // Scroll to the bottom if a message has been sent
    let messagesCount = this.props.subset?.messages?.length;
    if (messagesCount !== undefined && messagesCount > 0 && this.lastMessageId !== this.props.subset!.messages![messagesCount - 1].id) {
      this.lastMessageId = this.props.subset!.messages![messagesCount - 1].id;
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

          <div className="messageList" ref={this.messages} onWheel={this.handleScroll}>
            {this.props.subset.loadedToTop &&
              <p key={this.props.subset.id}>That's all the messages we have.</p>
            }

            {!this.props.subset.loadedToTop &&
              <p key={this.props.subset.id}>Loading more messages...</p>
            }

            {(this.props.subset.messages || []).map((message, index, array) =>
              <Message
                message={message}
                key={message.id}
                showUserCallback={this.props.showUser}
                showAttachmentCallback={this.showAttachment}
                scrollCallback={index === array.length - 1 ? () => {
                  this.messages.current!.scrollTop = this.messages.current!.scrollHeight
                } : () => { }} />
            )}
          </div>

          <MessageBox subsetId={this.props.subset.id} />

          <Modal
            visible={this.state.shownAttachment}
            className="noStyle"
            close={() => this.setState({ shownAttachment: false })}>
            <img
              src={this.context.getFileURL(this.state.shownAttachmentId)}
              onClick={() => open(this.context.getFileURL(this.state.shownAttachmentId))}
              className="limitSize" />
          </Modal>
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

Messages.contextType = ApiContext;

export default Messages;