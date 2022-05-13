import React from 'react';
import ApiContext from '../api/ApiContext';
import '../styles/Members.scss';

interface MembersProps {
  set: SetData,
  userCallback: (id: string) => void
}

class Members extends React.Component<MembersProps> {
  context!: React.ContextType<typeof ApiContext>;

  render() {
    return (
      <div className="Members">
        <div className="title">
          <h1>Members</h1>
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
    )
  }
}

Members.contextType = ApiContext;

export default Members;