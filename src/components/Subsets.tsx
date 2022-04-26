import React from 'react';
import '../styles/Subsets.scss';

import Subset from './Subset';

interface SubsetsProps {
  set: SetData,
  selectedSubset: string,
  selectCallback: (id: string) => void
}

class Subsets extends React.Component<SubsetsProps> {
  render() {
    return (
      <div className="Subsets">
        <div data-tauri-drag-region className="title">
          <h1>{this.props.set.name}</h1>
        </div>

        <div className="setList">
          {this.props.set.subsets.map(subset =>
            <Subset
              name={subset.name}
              selected={subset.id === this.props.selectedSubset}
              onClick={() => this.props.selectCallback(subset.id)}
              key={subset.id} />
          )}
        </div>
      </div>
    )
  }
}

export default Subsets;