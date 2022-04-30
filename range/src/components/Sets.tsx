import React from 'react';
import '../styles/Sets.scss';

import { appWindow } from '@tauri-apps/api/window';

import SetIcon from './SetIcon';
import AddSetIcon from './AddSetIcon';

interface SetsProps {
  sets: SetData[],
  selectedSet: string | null,
  selectCallback: (id: string) => void
}

class Sets extends React.Component<SetsProps> {
  render() {
    return (
      <div data-tauri-drag-region className="Sets">
        <div className="windowButtons">
          <div className="close" onClick={() => appWindow.close()} />
          <div className="minimise" onClick={() => appWindow.minimize()} />
          <div className="maximise" onClick={() => appWindow.toggleMaximize()} />
        </div>

        <div className="setList" data-tauri-drag-region>
          {this.props.sets.map(set =>
            <SetIcon
              set={set}
              selected={set.id === this.props.selectedSet}
              onClick={() => this.props.selectCallback(set.id)}
              key={set.id} />
          )}

          <AddSetIcon />
        </div>
      </div>
    )
  }
}

export default Sets;