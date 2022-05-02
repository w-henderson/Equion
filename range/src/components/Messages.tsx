import React from 'react';
import { DEFAULT_PROFILE_IMAGE } from '../api/Api';
import ApiContext from '../api/ApiContext';
import '../styles/Messages.scss';
import '../styles/UserInfo.scss';

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
  userPopupDetail: UserData | null
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
      userPopupDetail: null
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

  showUser(id: string) {
    this.setState({
      userPopup: id,
      userPopupDetail: null
    }, () => {
      this.context.getUserByUid(id).then(user => this.setState({ userPopupDetail: user }));
    });
  }

  hideUser() {
    this.setState({
      userPopup: null
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
            close={this.hideUser}
            className="UserInfo">

            {this.state.userPopupDetail !== null &&
              <>
                <img src={this.state.userPopupDetail.image} alt="Profile" />

                <h1>{this.state.userPopupDetail.displayName}</h1>
                <span>@{this.state.userPopupDetail.username}</span>

                <div>
                  <h2>About</h2>
                  {this.state.userPopupDetail.bio || <i>Not available.</i>}
                </div>
              </>
            }

            {this.state.userPopupDetail === null &&
              <>
                <img src={DEFAULT_PROFILE_IMAGE} alt="Profile" />

                <h1 className="placeholder">Loading...</h1>

                <div>
                  <p className="placeholder">Loading (this text is long)...</p>
                  <p className="placeholder">Loading short...</p>
                  <p className="placeholder">Loading medium......</p>
                </div>
              </>
            }
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