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
  members: UserData[],
  showUser: (id: string) => void,
  requestMoreMessages: () => Promise<void>,
}

interface MessagesState {
  waitingForMessages: boolean,
  scrollLockedToBottom: boolean,
  shownAttachment: boolean,
  shownAttachmentId?: string,
}

class Messages extends React.Component<MessagesProps, MessagesState> {
  context!: React.ContextType<typeof ApiContext>;
  messages: React.RefObject<HTMLDivElement>;
  lastId: string | null;
  lastMessageId: string | null;
  lastScrolledMessageTimestamp: number | null;

  constructor(props: MessagesProps) {
    super(props);

    this.state = {
      waitingForMessages: false,
      scrollLockedToBottom: true,
      shownAttachment: false
    }

    this.lastId = null;
    this.lastMessageId = null;
    this.lastScrolledMessageTimestamp = null;

    this.messages = React.createRef();

    this.handleScroll = this.handleScroll.bind(this);
    this.showAttachment = this.showAttachment.bind(this);
    this.lockScroll = this.lockScroll.bind(this);
  }

  componentDidMount() {
    if (this.messages.current) {
      this.messages.current.scrollTop = this.messages.current.scrollHeight;
    }
  }

  handleScroll(e: React.WheelEvent<HTMLDivElement>) {
    let scrollTop = this.messages.current!.scrollTop + e.deltaY;
    let scrollBottom = scrollTop + this.messages.current!.clientHeight;
    let scrollHeight = this.messages.current!.scrollHeight;

    if (scrollBottom >= scrollHeight) {
      this.setState({ scrollLockedToBottom: true });
    } else if (scrollTop <= 0 && !this.state.waitingForMessages && !this.props.subset?.loadedToTop) {
      let oldScrollHeight = this.messages.current!.scrollHeight;

      this.setState({
        scrollLockedToBottom: false,
        waitingForMessages: true
      }, () => {
        this.props.requestMoreMessages().then(() => {
          let newScrollHeight = this.messages.current!.scrollHeight;
          this.messages.current!.scrollTop = newScrollHeight - oldScrollHeight;
          this.setState({ waitingForMessages: false });
        });
      });
    } else {
      this.setState({ scrollLockedToBottom: false });
    }
  }

  lockScroll() {
    this.setState({ scrollLockedToBottom: true });
  }

  showAttachment(id: string) {
    this.setState({
      shownAttachment: true,
      shownAttachmentId: id
    });
  }

  componentDidUpdate() {
    if (this.state.scrollLockedToBottom) {
      this.messages.current!.scrollTop = this.messages.current!.scrollHeight;
    }

    if (this.props.subset !== undefined) {
      if (this.lastId !== this.props.subset.id) {
        this.lastId = this.props.subset.id;
        this.setState({ scrollLockedToBottom: true });
      } else {
        this.lastId = this.props.subset.id;
      }
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

            {(this.props.subset.messages || []).map((message) =>
              <Message
                message={message}
                key={message.id}
                showUserCallback={this.props.showUser}
                showAttachmentCallback={this.showAttachment}
                scrollCallback={() => {
                  if (this.state.scrollLockedToBottom) {
                    this.messages.current!.scrollTop = this.messages.current!.scrollHeight;
                  }
                }} />
            )}
          </div>

          {!this.state.scrollLockedToBottom &&
            <div className="scrollDownButton" onClick={this.lockScroll}>
              <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.25 5.5V18M12.25 18L6.25 12M12.25 18L18.25 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          }

          <MessageBox
            subsetId={this.props.subset.id}
            members={this.props.members}
            sendCallback={() => {
              this.setState({ scrollLockedToBottom: true });
            }} />

          <Modal
            visible={this.state.shownAttachment}
            className="noStyle"
            close={() => this.setState({ shownAttachment: false })}>
            <img
              src={this.context.getFileURL(this.state.shownAttachmentId)}
              onClick={() => open(this.context.getFileURL(this.state.shownAttachmentId))}
              className="limitSize"
              alt="Attachment" />
          </Modal>
        </div>
      )
    } else {
      return (
        <div className="Messages">
          <div data-tauri-drag-region className="title">
            <h1> </h1>
          </div>
        </div>
      )
    }
  }
}

Messages.contextType = ApiContext;

export default Messages;