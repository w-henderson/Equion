import React from "react";
import ApiContext from "../api/ApiContext";
import "../styles/Members.scss";

import { LeaveSetButton } from "./Svg";

interface MembersProps {
  set: SetData,
  userCallback: (id: string) => void,
  leaveCallback: () => void,
}

/**
 * Component for the members list.
 */
class Members extends React.Component<MembersProps> {
  context!: React.ContextType<typeof ApiContext>;

  /**
   * Renders the members list.
   */
  render() {
    const onlineUsers = this.props.set.members.filter(user => user.online || user.uid === this.context?.uid);
    const offlineUsers = this.props.set.members.filter(user => !user.online && user.uid !== this.context?.uid);

    return (
      <div className="Members">
        <div className="title">
          <h1>Members</h1>

          <LeaveSetButton onClick={this.props.leaveCallback} />
        </div>

        <div className="list">
          {onlineUsers.map(member =>
            <div className="member" key={member.uid} onClick={() => this.props.userCallback(member.uid)}>
              <img src={this.context!.getFileURL(member.image)} alt="Member" />

              <div>
                <h2>{member.displayName}</h2>
                <span>@{member.username}</span>
              </div>
            </div>
          )}

          {offlineUsers.map(member =>
            <div className="member offline" key={member.uid} onClick={() => this.props.userCallback(member.uid)}>
              <img src={this.context!.getFileURL(member.image)} alt="Member" />

              <div>
                <h2>{member.displayName}</h2>
                <span>@{member.username}</span>
              </div>
            </div>
          )}

          <div className="bottom">
            That's everyone.<br /><br />
            To invite some people to your set, click the share button on the left.
          </div>
        </div>
      </div>
    );
  }
}

Members.contextType = ApiContext;

export default Members;