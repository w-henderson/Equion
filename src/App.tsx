import React from 'react';
import './styles/App.scss';

import Sets from './components/Sets';
import Subsets from './components/Subsets';
import Messages from './components/Messages';

interface AppState {
  sets: SetData[],
  selectedSet: string
}

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      sets: [
        {
          id: "1",
          name: "William's Set",
          icon: "ω"
        },
        {
          id: "2",
          name: "Elliot's Set",
          icon: "ε"
        },
        {
          id: "3",
          name: "Frankie's Set",
          icon: "φ"
        }
      ],
      selectedSet: "1"
    }

    this.selectSet = this.selectSet.bind(this);
  }

  selectSet(id: string) {
    this.setState({ selectedSet: id });
  }

  render() {
    let selectedSet = this.state.sets.find(set => set.id === this.state.selectedSet)!;

    return (
      <div className="App">
        <Sets
          sets={this.state.sets}
          selectedSet={this.state.selectedSet}
          selectCallback={this.selectSet} />

        <Subsets set={selectedSet} />
        <Messages />
      </div>
    );
  }
}

export default App;
