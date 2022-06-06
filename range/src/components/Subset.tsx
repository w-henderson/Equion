import React from "react";
import "../styles/Subset.scss";

interface SubsetProps {
  name: string,
  selected: boolean,
  unread: boolean,
  onClick: () => void
}

/**
 * Component for an individual subset.
 */
class Subset extends React.Component<SubsetProps> {
  /**
   * Render the subset information.
   */
  render() {
    let className = "Subset";
    if (this.props.selected) className += " selected";
    if (this.props.unread) className += " unread";

    return (
      <div className={className} onClick={this.props.onClick}>
        <h2>
          {this.props.name}
        </h2>
      </div>
    );
  }
}

export default Subset;