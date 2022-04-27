import React from 'react';
import '../styles/Subset.scss';

interface SubsetProps {
  name: string,
  selected: boolean,
  onClick: () => void
}

class Subset extends React.Component<SubsetProps> {
  render() {
    return (
      <div className={this.props.selected ? "Subset selected" : "Subset"} onClick={this.props.onClick}>
        {this.props.name}
      </div>
    )
  }
}

export default Subset;