import React from 'react';
import '../styles/Subsets.scss';

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

  render() {
    if (this.props.set !== undefined) {
      return (
        <div className="Subsets">
          <div data-tauri-drag-region className="title">
            <h1>{this.props.set.name}</h1>
          </div>

          <div className="setList">
            {this.props.set.subsets.map(subset =>
              <Subset
                name={subset.name}
                selected={subset.id === this.props.selectedSubset}
                onClick={() => this.props.selectCallback(subset.id)}
                key={subset.id} />
            )}

            <AddSubset onClick={() => this.setState({ creatingSubset: true })} />
          </div>

          <Modal
            visible={this.state.creatingSubset}
            close={() => { if (!this.state.loading) this.setState({ creatingSubset: false }) }}>
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