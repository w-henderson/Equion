import React from 'react';
import '../styles/Subset.scss';

interface SubsetProps {
  name: string,
  selected: boolean,
  unread: boolean,
  onClick: () => void
}

class Subset extends React.Component<SubsetProps> {
  render() {
    let className = "Subset";
    if (this.props.selected) className += " selected";
    if (this.props.unread) className += " unread";

    return (
      <div className={className} onClick={this.props.onClick}>
        {this.props.name}
      </div>
    )
  }
}

export default Subset;