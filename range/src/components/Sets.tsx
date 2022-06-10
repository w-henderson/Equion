import React from "react";
import "../styles/Sets.scss";

import ApiContext from "../api/ApiContext";
import toast from "react-hot-toast";

import SetIcon from "./SetIcon";
import AddSetIcon from "./AddSetIcon";
import Modal from "./Modal";
import SetManager from "./SetManager";

interface SetsProps {
  sets: SetData[],
  selectedSet: string | null,
  ping: number | null,
  showUserCallback: (id: string) => void,
  selectCallback: (id: string) => void,
  createdCallback: (set: SetData) => void,
  leaveCallback: (id: string) => void
}

interface SetsState {
  creatingSet: boolean,
  loading: boolean,
}

/**
 * Component for the list of sets.
 */
class Sets extends React.Component<SetsProps, SetsState> {
  context!: React.ContextType<typeof ApiContext>;
  setManager: React.RefObject<SetManager>;

  /**
   * Initializes the component.
   */
  constructor(props: SetsProps) {
    super(props);

    this.state = {
      creatingSet: false,
      loading: false
    };

    this.setManager = React.createRef();

    this.createSet = this.createSet.bind(this);
    this.joinSet = this.joinSet.bind(this);
  }

  /**
   * Creates a set with the given name and icon.
   */
  createSet(name: string, icon: string) {
    this.setState({ loading: true });

    toast.promise(this.context!.createSet(name, icon), {
      loading: "Creating set...",
      success: "Set created!",
      error: (e) => `${e}`,
    }).then(set => {
      this.setState({
        creatingSet: false,
        loading: false,
      }, () => {
        this.props.createdCallback(set);
      });
    }, () => {
      if (this.setManager.current) this.setManager.current.clear();

      this.setState({
        loading: false
      });
    });
  }

  /**
   * Joins the given set.
   */
  joinSet(id: string) {
    this.setState({ loading: true });

    toast.promise(this.context!.joinSet(id), {
      loading: "Joining set...",
      success: "Set joined!",
      error: (e) => `${e}`,
    }).then(set => {
      this.setState({
        creatingSet: false,
        loading: false,
      }, () => {
        this.props.createdCallback(set);
      });
    }, () => {
      if (this.setManager.current) this.setManager.current.clear();

      this.setState({
        loading: false
      });
    });
  }

  /**
   * Renders the component.
   */
  render() {
    return (
      <div data-tauri-drag-region className="Sets">
        <div className="setList" data-tauri-drag-region>
          {this.props.sets.map(set =>
            <SetIcon
              set={set}
              selected={set.id === this.props.selectedSet}
              onClick={() => this.props.selectCallback(set.id)}
              leaveCallback={() => this.props.leaveCallback(set.id)}
              key={set.id} />
          )}

          <AddSetIcon onClick={() => {
            if (this.setManager.current) this.setManager.current.clear();

            this.setState({
              creatingSet: true,
              loading: false
            });
          }} />
        </div>

        <div className="userButton">
          <div>
            <img
              src={this.context!.getFileURL(this.context!.image)}
              alt="Profile"
              onClick={() => this.props.showUserCallback(this.context!.uid ?? "")} />

            <aside>
              <div>{this.props.ping === null ? "Connecting..." : <><b>{this.props.ping}</b> ms</>}</div>
            </aside>
          </div>
        </div>

        <Modal
          visible={this.state.creatingSet}
          close={() => { if (!this.state.loading) this.setState({ creatingSet: false }); }}>
          <SetManager
            ref={this.setManager}
            createSet={this.createSet}
            joinSet={this.joinSet} />
        </Modal>
      </div>
    );
  }
}

Sets.contextType = ApiContext;

export default Sets;