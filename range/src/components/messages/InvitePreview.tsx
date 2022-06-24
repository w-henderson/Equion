import React from "react";
import ApiContext from "../../api/ApiContext";
import "../../styles/messages/InvitePreview.scss";

import { Loading } from "../Svg";

interface InvitePreviewProps {
  id: string,
  join: () => void
}

interface InvitePreviewState {
  phase: "loading" | "visible" | "invalid",
  set: {
    name: string,
    icon: string
  } | null
}

/**
 * Component for the invite preview.
 */
class InvitePreview extends React.Component<InvitePreviewProps, InvitePreviewState> {
  context!: React.ContextType<typeof ApiContext>;

  /**
   * Initializes the component.
   */
  constructor(props: InvitePreviewProps) {
    super(props);

    this.state = {
      phase: "loading",
      set: null
    };

    this.open = this.open.bind(this);
  }

  /**
   * Loads the invite information for the given code.
   */
  componentDidMount() {
    const invalid = () => this.setState({ phase: "invalid" });

    this.context!.client.invite(this.props.id)
      .then(invite => this.setState({
        phase: "visible",
        set: {
          name: invite.setName,
          icon: invite.setIcon
        }
      }), invalid);
  }

  /**
   * Opens the invitation.
   */
  open() {
    this.props.join();
  }

  /**
   * Renders the invite preview.
   */
  render() {
    return (
      <div className="InvitePreview">
        {this.state.phase === "loading" && <Loading />}

        {this.state.phase === "invalid" &&
          <>
            <h1>Invalid code!</h1>

            <p>
              The invite code you entered is invalid.
            </p>
          </>
        }

        {(this.state.phase === "visible") &&
          <>
            <h2>You've been invited to</h2>

            <div className="main">
              <div className="icon">
                <span className="noModalStyle">{this.state.set?.icon}</span>
              </div>

              <h1>{this.state.set?.name}</h1>
            </div>


            <div className="buttons">
              <button onClick={this.open}>Open</button>
            </div>
          </>
        }
      </div>
    );
  }
}

InvitePreview.contextType = ApiContext;

export default InvitePreview;