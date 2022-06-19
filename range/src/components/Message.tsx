import React from "react";
import ApiContext from "../api/ApiContext";
import { MessageParser } from "../api/MessageParser";
import { open } from "@tauri-apps/api/shell";
import { clipboard } from "@tauri-apps/api";
import toast from "react-hot-toast";

import "../styles/Message.scss";

import defaultAttachment from "../images/default_attachment.jpg";
import MessageSegment from "./MessageSegment";
import LinkPreview from "./LinkPreview";

import ContextMenu, { handler } from "./ContextMenu";

interface MessageProps {
  message: MessageData,
  scrollCallback: (override?: boolean) => void,
  showUserCallback: (id: string) => void,
  showAttachmentCallback: (id: string) => void
}

interface MessageState {
  editing: boolean,
  content: string
}

/**
 * Component for a message.
 */
class Message extends React.Component<MessageProps, MessageState> {
  context!: React.ContextType<typeof ApiContext>;
  contextMenuRef: React.RefObject<ContextMenu> = React.createRef();

  /**
   * Initializes the component.
   */
  constructor(props: MessageProps) {
    super(props);

    this.state = {
      editing: false,
      content: ""
    };

    this.startEditing = this.startEditing.bind(this);
    this.saveEdit = this.saveEdit.bind(this);
    this.saveEditInternal = this.saveEditInternal.bind(this);
  }

  /**
   * Starts editing the message.
   */
  startEditing() {
    this.setState({
      editing: true,
      content: this.props.message.text
    });
  }

  /**
   * Handles the form event, then saves the edit.
   */
  saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    this.saveEditInternal();
  }

  /**
   * Saves the edited message to the server.
   */
  saveEditInternal() {
    if (this.state.content.trim().length === 0) return;

    this.context!.client.updateMessage(this.props.message.id, this.state.content);
  }

  /**
   * Prevents unnecessary re-renders.
   */
  shouldComponentUpdate(nextProps: MessageProps, nextState: MessageState): boolean {
    return this.props.message !== nextProps.message || this.state !== nextState;
  }

  /**
   * Stops editing the message when the edit comes through.
   */
  componentDidUpdate(prevProps: MessageProps) {
    if (prevProps.message !== this.props.message) {
      this.setState({ editing: false, content: "" });
    }
  }

  /**
   * Renders the message.
   */
  render() {
    const sendDate = new Date(this.props.message.timestamp);
    const sendDateString = sendDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isLocalSender = this.props.message.author.uid === this.context!.getUid();
    const parsedMessage = new MessageParser(this.props.message.text).parse();
    const firstLink = parsedMessage.find(segment => segment.type === "link")?.value;

    let attachment = undefined;

    if (this.props.message.attachment !== null && this.props.message.attachment.type.startsWith("image/")) {
      const attachmentId = this.props.message.attachment.id;

      attachment = (
        <div className="attachment">
          <img src={this.context!.getFileURL(attachmentId)} alt="Attachment" />

          <div
            className="attachmentInfo"
            onClick={() => this.props.showAttachmentCallback(attachmentId)}>
            <span className="attachmentName">{this.props.message.attachment.name}</span>
          </div>
        </div>
      );
    } else if (this.props.message.attachment !== null) {
      const attachmentId = this.props.message.attachment.id;

      attachment = (
        <div className="attachment">
          <img src={defaultAttachment} alt="Attachment" />

          <div
            className="attachmentInfo"
            onClick={() => open(this.context!.getFileURL(attachmentId))}>
            <span className="attachmentName">{this.props.message.attachment.name}</span>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={isLocalSender ? "Message local" : "Message"}>
          <img
            src={this.context!.getFileURL(this.props.message.author.image)}
            alt="Profile"
            onClick={() => this.props.showUserCallback(this.props.message.author.uid)} />

          <div
            className={this.context!.doesMessagePingMe(this.props.message.text) ? "content pingsMe" : "content"}
            onContextMenu={handler(this.contextMenuRef)}>

            {attachment}

            <div className="meta">
              <span className="name">{this.props.message.author.displayName}</span>
              <span className="date">{sendDateString}</span>
            </div>

            <div className="text">
              {!this.state.editing && parsedMessage.map((el, i) =>
                <MessageSegment
                  segment={el}
                  isLastSegment={i === parsedMessage.length - 1}
                  key={i}
                  scrollCallback={this.props.scrollCallback}
                  userCallback={() => this.props.showUserCallback(el.value)} />
              )}

              {this.state.editing &&
                <form onSubmit={this.saveEdit}>
                  <input
                    type="text"
                    value={this.state.content}
                    onChange={e => this.setState({ content: e.target.value })}
                    onClick={e => e.stopPropagation()}
                    autoFocus={true} />

                  <input type="submit" hidden />

                  <div>
                    <span onClick={() => this.setState({ editing: false, content: "" })}>cancel</span> &bull;
                    enter to <span onClick={this.saveEditInternal}>save</span>
                  </div>
                </form>
              }
            </div>

            {firstLink !== undefined && attachment === undefined &&
              <LinkPreview link={firstLink} />
            }
          </div>
        </div >

        <ContextMenu ref={this.contextMenuRef}>
          <div onClick={() => {
            clipboard.writeText(this.props.message.id).then(() => {
              toast.success("Message ID copied to clipboard!");
            }, () => {
              toast.error("Could not copy message ID to clipboard.");
            });
          }}>Copy ID</div>

          <div onClick={() => {
            clipboard.writeText(this.props.message.text).then(() => {
              toast.success("Message text copied to clipboard!");
            }, () => {
              toast.error("Could not copy message text to clipboard.");
            });
          }}>Copy Text</div>

          {isLocalSender &&
            <>
              <hr />

              <div onClick={this.startEditing}>Edit Message</div>

              <hr />

              <div onClick={() => this.context!.client.updateMessage(this.props.message.id, undefined, true)} className="delete">Delete Message</div>
            </>
          }
        </ContextMenu>
      </>
    );
  }
}

Message.contextType = ApiContext;

export default Message;