import React from 'react';
import '../styles/Sets.scss';

import { appWindow } from '@tauri-apps/api/window';

import SetIcon from './SetIcon';

class Sets extends React.Component {
  render() {
    return (
      <div data-tauri-drag-region className="Sets">
        <div className="windowButtons">
          <div className="close" onClick={() => appWindow.close()} />
          <div className="minimise" onClick={() => appWindow.minimize()} />
          <div className="maximise" onClick={() => appWindow.toggleMaximize()} />
        </div>

        <div className="setList">
          <SetIcon name="α" />
          <SetIcon name="β" />
          <SetIcon name="γ" />
          <SetIcon name="δ" />
          <SetIcon name="ε" />
          <SetIcon name="ζ" />
          <SetIcon name="η" />
          <SetIcon name="θ" />
          <SetIcon name="ι" />
          <SetIcon name="κ" />
          <SetIcon name="λ" />
          <SetIcon name="μ" />
          <SetIcon name="ν" />
          <SetIcon name="ξ" />
          <SetIcon name="ο" />
          <SetIcon name="π" />
          <SetIcon name="ρ" />
          <SetIcon name="σ" />
          <SetIcon name="τ" />
          <SetIcon name="υ" />
          <SetIcon name="φ" />
          <SetIcon name="χ" />
          <SetIcon name="ψ" />
          <SetIcon name="ω" />
        </div>
      </div>
    )
  }
}

export default Sets;