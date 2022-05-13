import React from 'react';
import ApiContext from '../api/ApiContext';
import { MessageParser } from '../api/MessageParser';
import { open } from '@tauri-apps/api/shell';

import '../styles/Message.scss';
import defaultAttachment from '../images/default_attachment.jpg';
import MessageSegment from './MessageSegment';

interface MessageProps {
  message: MessageData,
  scrollCallback: (override?: boolean) => void,
  showUserCallback: (id: string) => void,
  showAttachmentCallback: (id: string) => void
}

class Message extends React.Component<MessageProps> {
  context!: React.ContextType<typeof ApiContext>;

  shouldComponentUpdate(nextProps: MessageProps, _: {}): boolean {
    return this.props.message !== nextProps.message;
  }

  render() {
    let sendDate = new Date(this.props.message.timestamp);
    let sendDateString = sendDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let isLocalSender = this.props.message.author.uid === this.context.getUid();

    let parsedMessage = new MessageParser(this.props.message.text).parse();

    let attachment = undefined;

    if (this.props.message.attachment !== null && this.props.message.attachment.type.startsWith("image/")) {
      attachment = (
        <div className="attachment">
          <img src={this.context.getFileURL(this.props.message.attachment.id)} alt="Attachment" />

          <div
            className="attachmentInfo"
            onClick={() => this.props.showAttachmentCallback(this.props.message.attachment!.id)}>
            <span className="attachmentName">{this.props.message.attachment.name}</span>
          </div>
        </div>
      )
    } else if (this.props.message.attachment !== null) {
      attachment = (
        <div className="attachment">
          <img src={defaultAttachment} alt="Attachment" />

          <div
            className="attachmentInfo"
            onClick={() => open(this.context.getFileURL(this.props.message.attachment!.id))}>
            <span className="attachmentName">{this.props.message.attachment.name}</span>
          </div>
        </div>
      )
    }

    return (
      <div className={isLocalSender ? "Message local" : "Message"}>
        <img
          src={this.context.getFileURL(this.props.message.author.image)}
          alt="Profile"
          onClick={() => this.props.showUserCallback(this.props.message.author.uid)} />

        <div className={this.context.doesMessagePingMe(this.props.message.text) ? "content pingsMe" : "content"}>
          {attachment}

          <div className="meta">
            <span className="name">{this.props.message.author.displayName}</span>
            <span className="date">{sendDateString}</span>
          </div>

          <div className="text">
            {parsedMessage.map((el, i) =>
              <MessageSegment
                segment={el}
                key={i}
                scrollCallback={this.props.scrollCallback}
                userCallback={() => this.props.showUserCallback(el.value)} />
            )}
          </div>
        </div>
      </div>
    )
  }
}

Message.contextType = ApiContext;

export default Message;