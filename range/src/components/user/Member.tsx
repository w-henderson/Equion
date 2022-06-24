import React from "react";
import ContextMenu, { handler } from "../ContextMenu";

import { clipboard } from "@tauri-apps/api";
import toast from "react-hot-toast";

interface MemberProps {
  user: UserData,
  image: string,
  online: boolean,
  admin: boolean,
  onClick: () => void,
  kickCallback: () => void,
}

/**
 * Represents a member in the members list.
 */
class Member extends React.Component<MemberProps> {
  contextMenu: React.RefObject<ContextMenu> = React.createRef();

  /**
   * Renders the component.
   */
  render() {
    return (
      <>
        <div
          className={this.props.online ? "member" : "member offline"}
          onClick={this.props.onClick}
          onContextMenu={handler(this.contextMenu)}
          key={this.props.user.uid}>
          <img src={this.props.image} alt="Member" />

          <div>
            <h2>{this.props.user.displayName}</h2>
            <span>@{this.props.user.username}</span>
          </div>
        </div>

        <ContextMenu ref={this.contextMenu}>
          <div onClick={() => {
            clipboard.writeText(this.props.user.uid).then(() => {
              toast.success("User ID copied to clipboard!");
            }, () => {
              toast.error("Could not copy user ID to clipboard.");
            });
          }}>Copy ID</div>

          {this.props.admin &&
            <>
              <hr />

              <div className="delete" onClick={this.props.kickCallback}>Kick User</div>
            </>
          }
        </ContextMenu>
      </>
    );
  }
}

export default Member;