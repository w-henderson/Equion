import React from 'react';
import '../styles/SetIcon.scss';

interface SetIconProps {
  set: SetData,
  selected: boolean,
  onClick: () => void
}

class SetIcon extends React.Component<SetIconProps> {
  render() {
    let className = "SetIcon";
    if (this.props.selected) className += " selected";
    if (this.props.set.subsets.reduce((acc, subset) => acc || (subset.unread ?? false), false)) className += " unread";

    return (
      <div className={className} onClick={this.props.onClick}>
        {this.props.set.icon}
      </div>
    )
  }
}

export default SetIcon;