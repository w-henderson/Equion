import React from "react";

interface TypingIndicatorProps {
  members: UserData[],
  typing: TypingUser[]
}

/**
 * Component for the typing indicator.
 */
class TypingIndicator extends React.Component<TypingIndicatorProps> {
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
      <div className="TypingIndicator">
        {typing.map(m => m.displayName).join(", ")} is typing...
      </div>
    );
  }
}

export default TypingIndicator;