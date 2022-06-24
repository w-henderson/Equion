import React from "react";
import "../../styles/sets/Subset.scss";

interface AddSubsetProps {
  onClick: () => void
}

/**
 * Component for the add subset icon.
 */
class AddSubset extends React.Component<AddSubsetProps> {
  /**
   * Renders the add subset icon.
   */
  render() {
    return (
      <div className="Subset add" onClick={this.props.onClick}>
        Create Subset
      </div>
    );
  }
}

export default AddSubset;