import React from "react";
import ApiContext from "../../api/ApiContext";
import { open } from "@tauri-apps/api/shell";

import "../../styles/messages/Messages.scss";
import "../../styles/user/UserInfo.scss";

import Message from "./Message";
import MessageBox from "./MessageBox";
import Modal from "../Modal";
import TypingIndicator from "./TypingIndicator";
import { DownArrow } from "../Svg";

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

/**
 * Component for the messages list.
 */
class Messages extends React.Component<MessagesProps, MessagesState> {
  context!: React.ContextType<typeof ApiContext>;
  messages: React.RefObject<HTMLDivElement>;
  lastId: string | null;
  lastMessageId: string | null;
  lastScrolledMessageTimestamp: number | null;

  /**
   * Initializes the component.
   */
  constructor(props: MessagesProps) {
    super(props);

    this.state = {
      waitingForMessages: false,
      scrollLockedToBottom: true,
      shownAttachment: false
    };

    this.lastId = null;
    this.lastMessageId = null;
    this.lastScrolledMessageTimestamp = null;

    this.messages = React.createRef();

    this.handleScroll = this.handleScroll.bind(this);
    this.showAttachment = this.showAttachment.bind(this);
    this.lockScroll = this.lockScroll.bind(this);
  }

  /**
   * When the component has rendered for the first time, scroll to the bottom of the messages.
   */
  componentDidMount() {
    if (this.messages.current) {
      this.messages.current.scrollTop = this.messages.current.scrollHeight;
    }
  }

  /**
   * Handles scroll events.
   * 
   * If the scroll touches the bottom, it becomes locked to the bottom until it is scrolled up.
   * This means that it automatically scrolls down when new messages are received.
   * 
   * If the scroll touches the top, older messages are requested.
   */
  handleScroll(e: React.WheelEvent<HTMLDivElement>) {
    if (!this.messages.current) return;

    const scrollTop = this.messages.current.scrollTop + e.deltaY;
    const scrollBottom = scrollTop + this.messages.current.clientHeight;
    const scrollHeight = this.messages.current.scrollHeight;

    if (scrollBottom >= scrollHeight) {
      this.setState({ scrollLockedToBottom: true });
    } else if (scrollTop <= 0 && !this.state.waitingForMessages && !this.props.subset?.loadedToTop) {
      const oldScrollHeight = this.messages.current.scrollHeight;

      this.setState({
        scrollLockedToBottom: false,
        waitingForMessages: true
      }, () => {
        this.props.requestMoreMessages().then(() => {
          if (!this.messages.current) return;

          const newScrollHeight = this.messages.current.scrollHeight;
          this.messages.current.scrollTop = newScrollHeight - oldScrollHeight;
          this.setState({ waitingForMessages: false });
        });
      });
    } else {
      this.setState({ scrollLockedToBottom: false });
    }
  }

  /**
   * Locks the scroll to the bottom.
   */
  lockScroll() {
    this.setState({ scrollLockedToBottom: true });
  }

  /**
   * Shows an attachment in a fullscreen modal.
   */
  showAttachment(id: string) {
    this.setState({
      shownAttachment: true,
      shownAttachmentId: id
    });
  }

  /**
   * After each render, check whether scrolling is required.
   */
  componentDidUpdate() {
    if (this.state.scrollLockedToBottom && this.messages.current) {
      this.messages.current.scrollTop = this.messages.current.scrollHeight;
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

  /**
   * Renders the component.
   */
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
                  if (this.state.scrollLockedToBottom && this.messages.current) {
                    this.messages.current.scrollTop = this.messages.current.scrollHeight;
                  }
                }} />
            )}

            <TypingIndicator
              members={this.props.members}
              typing={this.props.subset.typing || []} />
          </div>

          {!this.state.scrollLockedToBottom &&
            <div className="scrollDownButton" onClick={this.lockScroll}>
              <DownArrow />
            </div>
          }

          <MessageBox
            key={this.props.subset.id}
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
              src={this.context!.getFileURL(this.state.shownAttachmentId)}
              onClick={() => open(this.context!.getFileURL(this.state.shownAttachmentId))}
              className="limitSize"
              alt="Attachment" />
          </Modal>
        </div>
      );
    } else {
      return (
        <div className="Messages">
          <div data-tauri-drag-region className="title">
            <h1> </h1>
          </div>
        </div>
      );
    }
  }
}

Messages.contextType = ApiContext;

export default Messages;