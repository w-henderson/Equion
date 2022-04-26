import React from 'react';
import '../styles/Subsets.scss';

interface SubsetsProps {
  set: SetData
}

class Subsets extends React.Component<SubsetsProps> {
  render() {
    return (
      <div className="Subsets">
        <div data-tauri-drag-region className="title">
          <h1>{this.props.set.name}</h1>
        </div>
        <div className="setList"></div>
      </div>
    )
  }
}

export default Subsets;