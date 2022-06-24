import React from "react";
import toast from "react-hot-toast";
import ApiContext from "../../api/ApiContext";
import "../../styles/user/Members.scss";

import Member from "./Member";

interface MembersProps {
  set: SetData,
  userCallback: (id: string) => void,
}

/**
 * Component for the members list.
 */
class Members extends React.Component<MembersProps> {
  context!: React.ContextType<typeof ApiContext>;

  /**
   * Initializes the component.
   */
  constructor(props: MembersProps) {
    super(props);

    this.kick = this.kick.bind(this);
  }

  /**
   * Kicks the given user from the set.
   */
  kick(id: string) {
    toast.promise(this.context!.client.kick(this.props.set.id, id), {
      error: e => `Could not kick user: ${e}`,
      loading: "Kicking user...",
      success: "User kicked!"
    });
  }

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
        </div>

        <div className="list">
          {onlineUsers.map(member =>
            <Member
              user={member}
              online={true}
              admin={this.props.set.admin}
              image={this.context!.getFileURL(member.image)}
              onClick={() => this.props.userCallback(member.uid)}
              kickCallback={() => this.kick(member.uid)}
              key={member.uid} />
          )}

          {offlineUsers.map(member =>
            <Member
              user={member}
              online={false}
              admin={this.props.set.admin}
              image={this.context!.getFileURL(member.image)}
              onClick={() => this.props.userCallback(member.uid)}
              kickCallback={() => this.kick(member.uid)}
              key={member.uid} />
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