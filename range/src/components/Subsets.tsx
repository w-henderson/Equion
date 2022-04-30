import React from 'react';
import '../styles/Subsets.scss';

import Subset from './Subset';

interface SubsetsProps {
  set: SetData | undefined,
  selectedSubset: string | null,
  selectCallback: (id: string) => void
}

class Subsets extends React.Component<SubsetsProps> {
  render() {
    if (this.props.set !== undefined) {
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
    } else {
      return (
        <div className="Subsets">
          <div data-tauri-drag-region className="title">
            <h1>Equion</h1>
          </div>
        </div>
      )
    }
  }
}

export default Subsets;