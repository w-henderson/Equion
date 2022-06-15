import React from "react";
import ApiContext from "../api/ApiContext";
import toast from "react-hot-toast";
import { clipboard } from "@tauri-apps/api";
import "../styles/InviteDialog.scss";

import Modal from "./Modal";

import { DeleteIcon, Loading } from "./Svg";

interface InviteDialogProps {
  set: string
}

interface InviteDialogState {
  phase: "hidden" | "loading" | "visible" | "creating",
  invites: InviteData[] | null,
  duration: number | null,
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
      invites: null,
      duration: 60
    };

    this.show = this.show.bind(this);
    this.copy = this.copy.bind(this);
    this.createInvite = this.createInvite.bind(this);
    this.revokeInvite = this.revokeInvite.bind(this);
  }

  /**
   * Shows the modal.
   */
  show() {
    this.setState({ phase: "loading" }, async () => {
      const invites = await this.context!.getInvites(this.props.set);
      this.setState({ phase: "visible", invites });
    });
  }

  /**
   * Copies the invite link to the clipboard.
   */
  copy(code: string) {
    clipboard.writeText(`${this.context!.region.apiRoute.replace("api/v1", "invite")}/${code}`).then(() => {
      toast.success("Share link copied to clipboard!");
    }, () => {
      toast.error("Could not copy share link to clipboard.");
    });
  }

  /**
   * Creates an invite then refreshes the dialog.
   */
  createInvite() {
    this.setState({ phase: "loading" }, () => {
      toast.promise(this.context!.createInvite(this.props.set, this.state.duration ?? undefined), {
        loading: "Creating invite...",
        error: e => `Error creating invite: ${e}`,
        success: "Invite created!"
      }).then(this.show);
    });
  }

  /**
   * Revokes the invite with the given ID and then refreshes the dialog.
   */
  revokeInvite(id: string) {
    this.setState({ phase: "loading" }, () => {
      toast.promise(this.context!.revokeInvite(this.props.set, id), {
        loading: "Revoking invite...",
        error: e => `Error revoking invite: ${e}`,
        success: "Invite revoked!"
      }).then(this.show);
    });
  }

  /**
   * Renders the invite dialog.
   */
  render() {
    return (
      <div className="InviteDialog">
        <Modal visible={this.state.phase !== "hidden"} close={() => this.setState({ phase: "hidden" })}>
          <div className="header">
            <h1>{this.state.phase === "creating" ? "Create Invite" : "Invites"}</h1>

            {this.state.phase === "creating" &&
              <div className="button" onClick={() => this.setState({ phase: "visible", duration: 60 })}>
                x
              </div>
            }

            {this.state.phase === "visible" &&
              <div className="button" onClick={() => this.setState({ phase: "creating", duration: 60 })}>
                +
              </div>
            }
          </div>

          {this.state.phase === "loading" && <Loading />}

          {this.state.phase !== "loading" && this.state.phase !== "creating" &&
            <div className="invites">
              {(this.state.invites ?? []).map(invite =>
                <div className="invite" key={invite.id} onClick={() => this.copy(invite.code)}>
                  <span className="noModalStyle">{invite.code}</span>
                  <span className="noModalStyle">{timeLeftForInvite(invite.expires)}</span>

                  <DeleteIcon onClick={e => {
                    e.stopPropagation();
                    this.revokeInvite(invite.id);
                  }} />
                </div>
              )}

              {this.state.invites?.length === 0 &&
                <span className="noModalStyle">No invites for this set.</span>
              }
            </div>
          }

          {this.state.phase === "creating" &&
            <>
              <div className="radio">
                <span
                  className={this.state.duration === 60 ? "noModalStyle selected" : "noModalStyle"}
                  onClick={() => this.setState({ duration: 60 })}>1 hour</span>
                <span
                  className={this.state.duration === 60 * 24 ? "noModalStyle selected" : "noModalStyle"}
                  onClick={() => this.setState({ duration: 60 * 24 })}>24 hours</span>
                <span
                  className={this.state.duration === 60 * 24 * 7 ? "noModalStyle selected" : "noModalStyle"}
                  onClick={() => this.setState({ duration: 60 * 24 * 7 })}>7 days</span>
                <span
                  className={this.state.duration === null ? "noModalStyle selected" : "noModalStyle"}
                  onClick={() => this.setState({ duration: null })}>Never</span>
              </div>

              <input
                type="button"
                value="Submit"
                onClick={this.createInvite} />
            </>
          }
        </Modal>
      </div>
    );
  }
}

InviteDialog.contextType = ApiContext;

/**
 * Formats the time left for an invite.
 */
function timeLeftForInvite(expires: number | null) {
  if (expires === null) return "Never expires";

  const now = new Date().getTime();
  const timeLeft = (expires * 1000) - now;

  if (timeLeft < 0) return "Expired";

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  if (days > 0) return `Expires in ${days} days`;
  if (hours > 0) return `Expires in ${hours} hours`;
  if (minutes > 0) return `Expires in ${minutes} minutes`;
  if (seconds > 0) return `Expires in ${seconds} seconds`;
  return "Expired";
}

export default InviteDialog;