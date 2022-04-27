import React from 'react';
import '../styles/SetIcon.scss';

interface SetIconProps {
  set: SetData,
  selected: boolean,
  onClick: () => void
}

class SetIcon extends React.Component<SetIconProps> {
  render() {
    return (
      <div className={this.props.selected ? "SetIcon selected" : "SetIcon"} onClick={this.props.onClick}>
        {this.props.set.icon}
      </div>
    )
  }
}

export default SetIcon;