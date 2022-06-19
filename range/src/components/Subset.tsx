import React from "react";
import "../styles/Subset.scss";

import ApiContext from "../api/ApiContext";

import { clipboard } from "@tauri-apps/api";
import toast from "react-hot-toast";

import ContextMenu, { handler } from "./ContextMenu";

interface SubsetProps {
  id: string,
  name: string,
  selected: boolean,
  unread: boolean,
  admin: boolean,
  onClick: () => void
}

interface SubsetState {
  renaming: boolean,
  name: string,
}

/**
 * Component for an individual subset.
 */
class Subset extends React.Component<SubsetProps, SubsetState> {
  context!: React.ContextType<typeof ApiContext>;
  contextMenuRef: React.RefObject<ContextMenu> = React.createRef();

  /**
   * Initializes the component.
   */
  constructor(props: SubsetProps) {
    super(props);

    this.state = {
      renaming: false,
      name: props.name,
    };

    this.rename = this.rename.bind(this);
  }

  /**
   * Renames the subset.
   */
  rename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (this.state.name.trim().length === 0) return;

    this.context!.client.updateSubset(this.props.id, this.state.name).then(() => this.setState({ renaming: false }));
  }

  /**
   * Prevent race conditions when multiple admins try to rename at the same time.
   */
  componentDidUpdate(prevProps: SubsetProps) {
    if (prevProps.name !== this.props.name) {
      this.setState({ renaming: false, name: this.props.name });
    }
  }

  /**
   * Render the subset information.
   */
  render() {
    let className = "Subset";
    if (this.props.selected) className += " selected";
    if (this.props.unread) className += " unread";

    return (
      <>
        <div className={className} onClick={this.props.onClick} onContextMenu={handler(this.contextMenuRef)}>
          <h2>
            {this.state.renaming &&
              <form onSubmit={this.rename}>
                <input
                  type="text"
                  value={this.state.name}
                  onChange={e => this.setState({ name: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  autoFocus={true} />

                <input type="submit" hidden />
              </form>
            }

            {!this.state.renaming &&
              <>{this.props.name}</>
            }
          </h2>
        </div>

        <ContextMenu ref={this.contextMenuRef}>
          <span>{this.props.name}</span>

          <hr />

          {this.props.admin &&
            <div onClick={() => this.setState({ renaming: true })}>Rename</div>
          }

          <div onClick={() => {
            clipboard.writeText(this.props.id).then(() => {
              toast.success("Subset ID copied to clipboard!");
            }, () => {
              toast.error("Could not copy subset ID to clipboard.");
            });
          }}>Copy ID</div>

          {this.props.admin &&
            <>
              <hr />

              <div onClick={() => this.context!.client.updateSubset(this.props.id, undefined, true)} className="delete">Delete Subset</div>
            </>
          }
        </ContextMenu>
      </>
    );
  }
}

Subset.contextType = ApiContext;

export default Subset;