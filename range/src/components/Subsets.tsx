import React from "react";
import "../styles/Subsets.scss";

import toast from "react-hot-toast";
import ApiContext from "../api/ApiContext";

import Subset from "./Subset";
import AddSubset from "./AddSubset";
import Modal from "./Modal";
import Voice from "./Voice";
import { ShareButton } from "./Svg";
import InviteDialog from "./InviteDialog";

interface SubsetsProps {
  set: SetData | undefined,
  selectedSubset: string | null,
  selectCallback: (id: string) => void
}

interface SubsetsState {
  creatingSubset: boolean,
  loading: boolean,
  subsetName: string,
}

/**
 * Component for the list of subsets.
 * 
 * This also handles subset creation.
 */
class Subsets extends React.Component<SubsetsProps, SubsetsState> {
  context!: React.ContextType<typeof ApiContext>;
  input: React.RefObject<HTMLInputElement>;
  inviteRef: React.RefObject<InviteDialog>;
  wasVisible = false;

  /**
   * Initializes the component.
   */
  constructor(props: SubsetsProps) {
    super(props);

    this.state = {
      creatingSubset: false,
      loading: false,
      subsetName: ""
    };

    this.input = React.createRef();
    this.inviteRef = React.createRef();

    this.createSubset = this.createSubset.bind(this);
    this.changeName = this.changeName.bind(this);
  }

  /**
   * Keeps track of whether the modal was visible before the component was updated.
   */
  componentDidUpdate() {
    if (!this.wasVisible && this.state.creatingSubset) {
      if (this.input.current) this.input.current.focus();
      this.wasVisible = true;
    }

    this.wasVisible = this.state.creatingSubset;
  }

  /**
   * Creates a new subset with the data from the state.
   */
  createSubset(e: React.FormEvent) {
    e.preventDefault();

    if (this.state.subsetName.length === 0 || this.props.set === undefined) return;

    this.setState({
      loading: true
    });

    toast.promise(this.context!.createSubset(this.state.subsetName, this.props.set.id), {
      loading: "Creating subset...",
      success: "Subset created!",
      error: (e) => `${e}`,
    }).then(() => {
      this.setState({
        creatingSubset: false,
        subsetName: "",
        loading: false,
      });
    }, () => {
      this.setState({
        loading: false
      });
    });
  }

  /**
   * Changes the name of the subset to be created.
   */
  changeName(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      subsetName: e.target.value
    });
  }

  /**
   * Renders the component.
   */
  render() {
    if (this.props.set !== undefined) {
      return (
        <div className="Subsets">
          <div data-tauri-drag-region className="title">
            <h1>{this.props.set.name}</h1>

            {this.props.set.admin &&
              <ShareButton onClick={() => { if (this.inviteRef.current) this.inviteRef.current.show(); }} />
            }
          </div>

          <div className="setList">
            {this.props.set.subsets.map(subset =>
              <Subset
                id={subset.id}
                name={subset.name}
                selected={subset.id === this.props.selectedSubset}
                unread={subset.unread ?? false}
                admin={this.props.set?.admin ?? false}
                onClick={() => this.props.selectCallback(subset.id)}
                key={subset.id} />
            )}

            {this.props.set.admin &&
              <AddSubset onClick={() => this.setState({ creatingSubset: true })} />
            }

            <Voice
              id={this.props.set.id}
              members={this.props.set.voiceMembers} />
          </div>

          <InviteDialog set={this.props.set.id} ref={this.inviteRef} />

          <Modal
            visible={this.state.creatingSubset}
            close={() => { if (!this.state.loading) this.setState({ creatingSubset: false, subsetName: "" }); }}>
            <h1>Create a Subset</h1>

            <form onSubmit={this.createSubset}>
              <input
                type="text"
                placeholder="Subset Name"
                key="subset_name"
                value={this.state.subsetName}
                autoComplete={"off"}
                ref={this.input}
                onChange={this.changeName} />

              <div>
                ζ
              </div>

              <input
                type="submit"
                value={this.state.loading ? "Loading..." : "Create Subset"}
                key="create_subset"
                disabled={this.state.loading} />
            </form>
          </Modal>
        </div>
      );
    } else {
      return (
        <div className="Subsets">
          <div data-tauri-drag-region className="title">
            <h1>Equion</h1>
          </div>
        </div>
      );
    }
  }
}

Subsets.contextType = ApiContext;

export default Subsets;