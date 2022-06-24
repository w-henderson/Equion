import React from "react";
import { clipboard } from "@tauri-apps/api";
import toast from "react-hot-toast";
import "../styles/SetIcon.scss";

import ContextMenu, { handler } from "./ContextMenu";

interface SetIconProps {
  set: SetData,
  selected: boolean,
  onClick: () => void,
  leaveCallback: () => void,
  deleteCallback: () => void,
}

/**
 * Component for the set icon.
 */
class SetIcon extends React.Component<SetIconProps> {
  contextMenuRef: React.RefObject<ContextMenu> = React.createRef();

  /**
   * Render the set icon.
   */
  render() {
    let className = "SetIcon";
    if (this.props.selected) className += " selected";
    if (this.props.set.subsets.reduce((acc, subset) => acc || (subset.unread ?? false), false)) className += " unread";

    return (
      <>
        <div className={className} onClick={this.props.onClick} onContextMenu={handler(this.contextMenuRef)}>
          {this.props.set.icon}
        </div>

        <ContextMenu ref={this.contextMenuRef}>
          <div onClick={() => {
            clipboard.writeText(this.props.set.id).then(() => {
              toast.success("Set ID copied to clipboard!");
            }, () => {
              toast.error("Could not copy set ID to clipboard.");
            });
          }}>Copy ID</div>

          <hr />

          <div className="delete" onClick={this.props.leaveCallback}>Leave Set</div>

          {this.props.set.admin &&
            <div className="delete" onClick={this.props.deleteCallback}>Delete Set</div>
          }
        </ContextMenu>
      </>
    );
  }
}

export default SetIcon;