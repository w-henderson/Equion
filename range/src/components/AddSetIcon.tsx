import React from 'react';
import '../styles/SetIcon.scss';

interface AddSetIconProps {
  onClick: () => void
}

class AddSetIcon extends React.Component<AddSetIconProps> {
  render() {
    return (
      <div className="SetIcon add" onClick={this.props.onClick}>
        +
      </div>
    )
  }
}

export default AddSetIcon;