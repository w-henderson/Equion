import React from "react";
import ApiContext from "../api/ApiContext";
import Modal from "./Modal";
import "../styles/InviteDialog.scss";

import { Loading } from "./Svg";

interface InviteDialogProps {
  joinCallback: (set: SetData) => void,
}

interface InviteDialogState {
  phase: "hidden" | "loading" | "visible" | "invalid",
  code: string | null,
  set: {
    name: string,
    icon: string
  } | null
}

/**
 * Component for the invite dialog.
 */
class InviteDialog extends React.Component<InviteDialogProps, InviteDialogState> {
  context!: React.ContextType<typeof ApiContext>;

  /**
   * Initializes the component.
   */
  constructor(props: InviteDialogProps) {
    super(props);

    this.state = {
      phase: "hidden",
      code: null,
      set: null
    };

    this.show = this.show.bind(this);
    this.accept = this.accept.bind(this);
  }

  /**
   * Shows the invite information for the given code.
   */
  show(code: string) {
    const invalid = () => this.setState({ phase: "invalid", code: null });

    this.setState({ phase: "loading", code }, () => {
      this.context!.getInvite(code)
        .then(invite => this.context!.getSet(invite.set), invalid)
        .then(set => {
          if (set) {
            this.setState({
              phase: "visible",
              set: {
                name: set.name,
                icon: set.icon
              }
            });
          }
        }, invalid);
    });
  }

  /**
   * Accepts the invitation.
   */
  accept() {
    this.setState({ phase: "loading" }, () => {
      this.context!.joinSet(this.state.code!).then(this.props.joinCallback, () => this.setState({ phase: "invalid", code: null }));
    });
  }

  /**
   * Renders the invite dialog.
   */
  render() {
    return (
      <div className="InviteDialog">
        <Modal visible={this.state.phase !== "hidden"} close={() => this.setState({ phase: "hidden" })}>
          {this.state.phase === "loading" && <Loading />}

          {this.state.phase === "invalid" &&
            <>
              <h1>Invalid code!</h1>

              <p>
                The invite code you entered is invalid.
              </p>
            </>
          }

          {(this.state.phase === "visible" || this.state.phase === "hidden") &&
            <>
              <div className="icon">
                <span className="noModalStyle">{this.state.set?.icon}</span>
              </div>

              <h2>You've been invited to</h2>
              <h1>{this.state.set?.name}</h1>

              <div className="buttons">
                <button onClick={this.accept}>Accept</button>
                <button onClick={() => this.setState({ phase: "hidden" })}>Decline</button>
              </div>
            </>
          }
        </Modal>
      </div>
    );
  }
}

InviteDialog.contextType = ApiContext;

export default InviteDialog;