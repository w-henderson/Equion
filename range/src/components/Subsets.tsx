import React from 'react';
import '../styles/Subsets.scss';

import { clipboard } from '@tauri-apps/api';
import toast from 'react-hot-toast';
import ApiContext from '../api/ApiContext';

import Subset from './Subset';
import AddSubset from './AddSubset';
import Modal from './Modal';

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

class Subsets extends React.Component<SubsetsProps, SubsetsState> {
  context!: React.ContextType<typeof ApiContext>;
  input: React.RefObject<HTMLInputElement>;
  wasVisible: boolean = false;

  constructor(props: SubsetsProps) {
    super(props);

    this.state = {
      creatingSubset: false,
      loading: false,
      subsetName: ""
    }

    this.input = React.createRef();

    this.createSubset = this.createSubset.bind(this);
    this.changeName = this.changeName.bind(this);
    this.share = this.share.bind(this);
  }

  componentDidUpdate() {
    if (!this.wasVisible && this.state.creatingSubset) {
      this.input.current!.focus();
      this.wasVisible = true;
    }

    this.wasVisible = this.state.creatingSubset;
  }

  createSubset(e: React.FormEvent) {
    e.preventDefault();

    if (this.state.subsetName.length === 0) return;

    this.setState({
      loading: true
    });

    toast.promise(this.context.createSubset(this.state.subsetName, this.props.set!.id), {
      loading: "Creating subset...",
      success: "Subset created!",
      error: (e) => `${e}`,
    }).then(_ => {
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

  changeName(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      subsetName: e.target.value
    })
  }

  share() {
    clipboard.writeText(this.props.set!.id).then(() => {
      toast.success("Share link copied to clipboard!");
    }, () => {
      toast.error("Could not copy share link to clipboard.");
    })
  }

  render() {
    if (this.props.set !== undefined) {
      return (
        <div className="Subsets">
          <div data-tauri-drag-region className="title">
            <h1>{this.props.set.name}</h1>

            <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={this.share}>
              <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.5 6.5L8.5 10.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8.5 13.5L15.5 17.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="setList">
            {this.props.set.subsets.map(subset =>
              <Subset
                name={subset.name}
                selected={subset.id === this.props.selectedSubset}
                onClick={() => this.props.selectCallback(subset.id)}
                key={subset.id} />
            )}

            {this.props.set.admin &&
              <AddSubset onClick={() => this.setState({ creatingSubset: true })} />
            }
          </div>

          <Modal
            visible={this.state.creatingSubset}
            close={() => { if (!this.state.loading) this.setState({ creatingSubset: false, subsetName: "" }) }}>
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
      )
    } else {
      return (
        <div className="Subsets">
          <div data-tauri-drag-region className="title">
            <h1>Equion</h1>
          </div>
        </div>
      )
    }
  }
}

Subsets.contextType = ApiContext;

export default Subsets;