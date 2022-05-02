import React from 'react';
import '../styles/Subset.scss';

interface AddSubsetProps {
  onClick: () => void
}

class AddSubset extends React.Component<AddSubsetProps> {
  render() {
    return (
      <div className="Subset add" onClick={this.props.onClick}>
        Create Subset
      </div>
    )
  }
}

export default AddSubset;