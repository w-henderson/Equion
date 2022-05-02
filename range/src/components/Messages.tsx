import React from 'react';
import ApiContext from '../api/ApiContext';
import '../styles/Messages.scss';

import Message from "./Message";
import MessageBox from './MessageBox';
import Modal from './Modal';

interface MessagesProps {
  subset: SubsetData | undefined,
  requestMoreMessages: () => Promise<void>,
}

interface MessagesState {
  waitingForMessages: boolean,
  userPopup: string | null,
  userPopupLoaded: boolean
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
      userPopup: null,
      userPopupLoaded: false
    }

    this.lastId = null;
    this.lastMessageId = null;

    this.showUser = this.showUser.bind(this);
    this.hideUser = this.hideUser.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.messages = React.createRef();
  }

  componentDidMount() {
    if (this.messages.current) {
      this.messages.current.scrollTop = this.messages.current.scrollHeight;
    }
  }

  showUser(id: string) { }

  hideUser() {
    this.setState({
      userPopup: null,
      userPopupLoaded: false
    })
  }

  handleScroll(e: React.WheelEvent<HTMLDivElement>) {
    if (e.deltaY < 0 && this.messages.current!.scrollTop === 0 && !this.state.waitingForMessages) {
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

            {(this.props.subset.messages || []).map(message =>
              <Message
                message={message}
                key={message.id}
                showUserCallback={this.showUser}
                scrollCallback={() => { this.messages.current!.scrollTop = this.messages.current!.scrollHeight }} />
            )}
          </div>

          <MessageBox subsetId={this.props.subset.id} />

          <Modal
            visible={this.state.userPopup !== null}
            close={this.hideUser}>

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