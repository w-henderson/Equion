import React from "react";
import ApiContext from "../../api/ApiContext";

interface TypingIndicatorProps {
  members: UserData[],
  typing: TypingUser[]
}

/**
 * Component for the typing indicator.
 */
class TypingIndicator extends React.Component<TypingIndicatorProps> {
  context!: React.ContextType<typeof ApiContext>;
  interval: number | null = null;

  /**
   * Set the component to re-render every second.
   */
  componentDidMount() {
    this.interval = window.setInterval(() => this.forceUpdate(), 1000);
  }

  /**
   * Clears the interval.
   */
  componentWillUnmount() {
    if (this.interval) {
      window.clearInterval(this.interval);
    }
  }

  /**
   * Renders the component.
   */
  render() {
    const timestamp = new Date().getTime();

    const typing = this.props.typing
      .map(user => this.props.members.find(m => m.uid === user.uid && user.lastTyped + 2000 > timestamp))
      .filter(m => m !== undefined) as UserData[];

    if (typing.length === 0) {
      return <></>;
    }

    return (
      <div className="Message typing">
        <img
          src={this.context!.getFileURL(typing[0].image)}
          alt="Profile" />

        <div className="content">
          <div className="text">
            <div className="TypingIndicator">
              <div className="typingDot" style={{ animationDelay: "0s" }} />
              <div className="typingDot" style={{ animationDelay: "0.2s" }} />
              <div className="typingDot" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        </div>

        <div className="typingNames">
          {typing.length === 1 &&
            <>{typing[0].displayName} is typing...</>
          }

          {typing.length === 2 &&
            <>{typing[0].displayName} and 1 other are typing...</>
          }

          {typing.length > 2 &&
            <>{typing[0].displayName} and {typing.length - 1} others are typing...</>
          }
        </div>
      </div>
    );
  }
}

TypingIndicator.contextType = ApiContext;

export default TypingIndicator;