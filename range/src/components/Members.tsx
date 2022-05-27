import React from "react";
import ApiContext from "../api/ApiContext";
import "../styles/Members.scss";

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
    return (
      <div className="Members">
        <div className="title">
          <h1>Members</h1>

          <svg
            width="24"
            height="24"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            onClick={this.props.leaveCallback}>

            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12H12L15 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="list">
          {this.props.set.members.map(member =>
            <div className="member" key={member.uid} onClick={() => this.props.userCallback(member.uid)}>
              <img src={this.context.getFileURL(member.image)} alt="Member" />

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