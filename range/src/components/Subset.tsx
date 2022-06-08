import React from "react";
import "../styles/Subset.scss";

import { clipboard } from "@tauri-apps/api";
import toast from "react-hot-toast";

import ContextMenu, { handler } from "./ContextMenu";

interface SubsetProps {
  id: string,
  name: string,
  selected: boolean,
  unread: boolean,
  onClick: () => void
}

/**
 * Component for an individual subset.
 */
class Subset extends React.Component<SubsetProps> {
  contextMenuRef: React.RefObject<ContextMenu> = React.createRef();

  /**
   * Render the subset information.
   */
  render() {
    let className = "Subset";
    if (this.props.selected) className += " selected";
    if (this.props.unread) className += " unread";

    return (
      <>
        <div className={className} onClick={this.props.onClick} onContextMenu={handler(this.contextMenuRef)}>
          <h2>
            {this.props.name}
          </h2>
        </div>

        <ContextMenu ref={this.contextMenuRef}>
          <span>{this.props.name}</span>

          <hr />

          <div onClick={() => null}>Rename</div>

          <div onClick={() => {
            clipboard.writeText(this.props.id).then(() => {
              toast.success("Subset ID copied to clipboard!");
            }, () => {
              toast.error("Could not copy subset ID to clipboard.");
            });
          }}>Copy ID</div>

          <hr />

          <div onClick={() => null} className="delete">Delete Channel</div>
        </ContextMenu>
      </>
    );
  }
}

export default Subset;