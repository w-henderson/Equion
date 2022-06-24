import React from "react";
import "../../styles/user/RegionSelector.scss";

import REGIONS from "../../servers.json";

import gbFlag from "../../images/flags/gb.svg";
import usFlag from "../../images/flags/us.svg";
import xxFlag from "../../images/flags/xx.svg";

const FLAGS = {
  gb: gbFlag,
  us: usFlag,
  xx: xxFlag,
};

interface RegionSelectorProps {
  region: RegionData,
  setRegion: (region: number) => void
}

interface RegionSelectorState {
  visible: boolean
}

/**
 * Component for the region selector.
 */
class RegionSelector extends React.Component<RegionSelectorProps, RegionSelectorState> {
  /**
   * Initializes the component.
   */
  constructor(props: RegionSelectorProps) {
    super(props);

    this.state = {
      visible: false
    };
  }

  /**
   * Renders the component.
   */
  render() {
    /* eslint-disable */
    return (
      <div className={this.state.visible ? "RegionSelector highlight" : "RegionSelector"}>
        {this.state.visible &&
          <div className="regionsList">
            <span>
              <span
                onClick={() => this.setState({ visible: false })}
                className="closeButton">
                x
              </span>

              <span>
                <b>Warning</b>: Regions are currently independent of each other, so data on one region is not available on another.
              </span>
            </span>

            {REGIONS.map((region: RegionData, i) => (
              <div key={region.id} onClick={() => this.props.setRegion(i)} className="region">
                <img src={(FLAGS as any)[region.country]} alt="Flag" />
                <span>{region.name}</span>
              </div>
            ))}
          </div>
        }

        <div
          className="region"
          onClick={() => this.setState(state => { return { ...state, visible: !state.visible } })}>

          <img src={(FLAGS as any)[this.props.region.country]} alt="Flag" />
          <span>{this.props.region.name}</span>
        </div>
      </div>
    );
  }
}

export default RegionSelector;