import React from 'react';
import '../styles/SetIcon.scss';

interface SetIconProps {
  name: string
}

class SetIcon extends React.Component<SetIconProps> {
  render() {
    return (
      <div className="SetIcon">
        {this.props.name}
      </div>
    )
  }
}

export default SetIcon;