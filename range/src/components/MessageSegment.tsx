import React from "react";
import { MathJax } from "better-react-mathjax";

import ApiContext from "../api/ApiContext";
import { MessageSegment as MessageSegmentData, MessageSegmentType } from "../api/MessageParser";

interface MessageSegmentProps {
  segment: MessageSegmentData,
  isLastSegment: boolean,
  scrollCallback: (override?: boolean) => void,
  userCallback: () => void
}

interface MessageSegmentState {
  typeset: boolean,
  username: string | null,
  invalidPing: boolean
}

/**
 * Component for a message segment.
 */
class MessageSegment extends React.Component<MessageSegmentProps, MessageSegmentState> {
  context!: React.ContextType<typeof ApiContext>;

  /**
   * Initialises the component.
   */
  constructor(props: MessageSegmentProps) {
    super(props);

    this.state = {
      typeset: props.segment.type !== MessageSegmentType.BlockLatex && props.segment.type !== MessageSegmentType.InlineLatex,
      username: null,
      invalidPing: false
    };

    this.scroll = this.scroll.bind(this);
  }

  /**
   * If the segment is a mention, load the user who it mentions and display their name.
   */
  componentDidMount() {
    if (this.props.segment.type === MessageSegmentType.Ping) {
      this.context!.getUserByUid(this.props.segment.value).then(user => {
        this.setState({ username: user.displayName }, () => this.props.scrollCallback(true));
      }, () => {
        this.setState({ username: "Invalid ping", invalidPing: true });
      });
    }
  }

  /**
   * Scrolls to the bottom if necessary.
   * 
   * This is called after MathJax has typeset the LaTeX.
   */
  scroll() {
    this.props.scrollCallback();
    this.setState({ typeset: true });
  }

  /**
   * Renders the component.
   */
  /* eslint-disable */
  render() {
    switch (this.props.segment.type) {
      case MessageSegmentType.Plain:
        return <span>{this.props.segment.value}</span>;

      case MessageSegmentType.BlockLatex:
        return <MathJax
          className="blockLatex"
          onTypeset={this.state.typeset ? undefined : this.scroll}>
          \[{this.props.segment.value}\]
        </MathJax>;

      case MessageSegmentType.InlineLatex:
        return <MathJax
          className="inlineLatex"
          onTypeset={this.state.typeset ? undefined : this.scroll}>
          \[{this.props.segment.value}\]
        </MathJax>;

      case MessageSegmentType.BlockCode:
        return <pre style={this.props.isLastSegment ? { marginBottom: 0 } : undefined}>{this.props.segment.value}</pre>;

      case MessageSegmentType.InlineCode:
        return <code>{this.props.segment.value}</code>;

      case MessageSegmentType.Bold:
        return <b>{this.props.segment.value}</b>;

      case MessageSegmentType.Italic:
        return <i>{this.props.segment.value}</i>;

      case MessageSegmentType.Underline:
        return <u>{this.props.segment.value}</u>;

      case MessageSegmentType.Strike:
        return <s>{this.props.segment.value}</s>;

      case MessageSegmentType.Ping:
        if (this.state.invalidPing) {
          return <span className="ping invalid">User Not Found</span>;
        } else {
          return <span className="ping" onClick={this.props.userCallback}>@{this.state.username || <div />}</span>;
        }

      case MessageSegmentType.Link:
        return <a href={this.props.segment.value} target="_blank" rel="noopener noreferrer">{this.props.segment.value}</a>;

      case MessageSegmentType.Newline:
        return <br />;

      case MessageSegmentType.Unparsed:
        throw new Error("Unparsed message segment");
    }
  }
}

MessageSegment.contextType = ApiContext;

export default MessageSegment;