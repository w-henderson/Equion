import React from 'react';
import '../styles/Sets.scss';

import ApiContext from '../api/ApiContext';
import { appWindow } from '@tauri-apps/api/window';
import toast from 'react-hot-toast';

import SetIcon from './SetIcon';
import AddSetIcon from './AddSetIcon';
import Modal from './Modal';

interface SetsProps {
  sets: SetData[],
  selectedSet: string | null,
  selectCallback: (id: string) => void,
  createdCallback: (set: SetData) => void
}

interface SetsState {
  creatingSet: boolean,
  loading: boolean,
  setName: string,
  icon: string,
}

const ICONS = [
  'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ',
  'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'
];

class Sets extends React.Component<SetsProps, SetsState> {
  context!: React.ContextType<typeof ApiContext>;

  constructor(props: SetsProps) {
    super(props);

    this.state = {
      creatingSet: false,
      loading: false,
      setName: "",
      icon: "Icon"
    }

    this.createSet = this.createSet.bind(this);
    this.changeName = this.changeName.bind(this);
    this.changeIcon = this.changeIcon.bind(this);
  }

  createSet(e: React.FormEvent) {
    e.preventDefault();

    if (this.state.setName.length === 0) return;

    if (!ICONS.includes(this.state.icon)) {
      toast.error("Invalid icon");
      return;
    }

    this.setState({
      loading: true
    });

    toast.promise(this.context.createSet(this.state.setName, this.state.icon), {
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
      this.setState({
        loading: false
      });
    });
  }

  changeName(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value.length > 0) {
      this.setState({
        setName: e.target.value,
        icon: this.context.getGreekLetter(e.target.value[0].toLowerCase())
      });
    } else {
      this.setState({
        setName: "",
        icon: "α"
      });
    }
  }

  changeIcon(direction: number) {
    let currentIndex = ICONS.indexOf(this.state.icon);
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = ICONS.length - 1;
    if (newIndex >= ICONS.length) newIndex = 0;

    this.setState({
      icon: ICONS[newIndex]
    })
  }

  render() {
    return (
      <div data-tauri-drag-region className="Sets">
        <div className="windowButtons">
          <div className="close" onClick={() => appWindow.close()} />
          <div className="minimise" onClick={() => appWindow.minimize()} />
          <div className="maximise" onClick={() => appWindow.toggleMaximize()} />
        </div>

        <div className="setList" data-tauri-drag-region>
          {this.props.sets.map(set =>
            <SetIcon
              set={set}
              selected={set.id === this.props.selectedSet}
              onClick={() => this.props.selectCallback(set.id)}
              key={set.id} />
          )}

          <AddSetIcon onClick={() => this.setState({
            creatingSet: true,
            loading: false,
            setName: "",
            icon: "Icon"
          })} />
        </div>

        <Modal
          visible={this.state.creatingSet}
          close={() => { if (!this.state.loading) this.setState({ creatingSet: false }) }}>
          <h1>Create a Set</h1>

          <form onSubmit={this.createSet}>
            <input
              type="text"
              placeholder="Set Name"
              key="set_name"
              value={this.state.setName}
              autoComplete={"off"}
              onChange={this.changeName} />

            <div className="input">
              <div onClick={() => this.changeIcon(-1)}>&lt;</div>

              <input
                type="text"
                key="icon"
                value={this.state.icon}
                className={this.state.icon === "Icon" ? "placeholder" : undefined}
                readOnly={true} />

              <div onClick={() => this.changeIcon(1)}>&gt;</div>
            </div>

            <input
              type="submit"
              value={this.state.loading ? "Loading..." : "Create Set"}
              key="create_set"
              disabled={this.state.loading} />
          </form>
        </Modal>
      </div>
    )
  }
}

Sets.contextType = ApiContext;

export default Sets;