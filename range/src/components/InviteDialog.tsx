import React from "react";
import ApiContext from "../api/ApiContext";
import toast from "react-hot-toast";
import Modal from "./Modal";
import "../styles/InviteDialog.scss";

import { Loading } from "./Svg";

interface InviteDialogProps {
  joinCallback: (set: SetData) => void,
}

interface InviteDialogState {
  visible: boolean,
  phase: "loading" | "visible" | "invalid",
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
      visible: false,
      phase: "loading",
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

    this.setState({ visible: true, phase: "loading", code }, () => {
      this.context!.client.invite(code)
        .then(invite => this.setState({
          phase: "visible",
          set: {
            name: invite.setName,
            icon: invite.setIcon
          }
        }), invalid);
    });
  }

  /**
   * Accepts the invitation.
   */
  accept() {
    this.setState({ phase: "loading" }, () => {
      this.context!.client.joinSet(this.state.code!).then(s => {
        toast.success("Successfully accepted invite!");
        this.props.joinCallback(s);
        this.setState({ visible: false, code: null });
      }, (e: string) => {
        toast.error(`Could not accept invite: ${e}`);
        this.setState({ visible: false, code: null });
      });
    });
  }

  /**
   * Renders the invite dialog.
   */
  render() {
    return (
      <div className="InviteDialog">
        <Modal visible={this.state.visible} close={() => this.setState({ visible: false })}>
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
              <div className="icon">
                <span className="noModalStyle">{this.state.set?.icon}</span>
              </div>

              <h2>You've been invited to</h2>
              <h1>{this.state.set?.name}</h1>

              <div className="buttons">
                <button onClick={this.accept}>Accept</button>
                <button onClick={() => this.setState({ visible: false })}>Decline</button>
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