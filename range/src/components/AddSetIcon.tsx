import React from "react";
import "../styles/SetIcon.scss";

interface AddSetIconProps {
  onClick: () => void
}

/**
 * Component for the add set icon.
 */
class AddSetIcon extends React.Component<AddSetIconProps> {
  /**
   * Renders the add set icon.
   */
  render() {
    return (
      <div className="SetIcon add" onClick={this.props.onClick}>
        +
      </div>
    );
  }
}

export default AddSetIcon;