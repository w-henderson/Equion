import React from 'react';
import './styles/App.scss';

import { MathJaxContext } from 'better-react-mathjax';

import ApiContext from './api/ApiContext';
import Api from './api/Api';

import Sets from './components/Sets';
import Subsets from './components/Subsets';
import Messages from './components/Messages';

interface AppState {
  api: Api,
  sets: SetData[],
  selectedSet: string,
  selectedSubset: string
}

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);

    let subsets = [
      {
        id: "1",
        name: "General",
      },
      {
        id: "2",
        name: "Quotes"
      },
      {
        id: "3",
        name: "Differontial Equions"
      }
    ];

    this.state = {
      api: new Api(),
      sets: [
        {
          id: "1",
          name: "William's Set",
          icon: "ω",
          subsets
        },
        {
          id: "2",
          name: "Elliot's Set",
          icon: "ε",
          subsets
        },
        {
          id: "3",
          name: "Frankie's Set",
          icon: "φ",
          subsets
        }
      ],
      selectedSet: "1",
      selectedSubset: "1"
    }

    this.selectSet = this.selectSet.bind(this);
    this.selectSubset = this.selectSubset.bind(this);
  }

  selectSet(id: string) {
    let set = this.state.sets.find(set => set.id === id)!;
    this.setState({
      selectedSet: id,
      selectedSubset: set.subsets[0].id
    });
  }

  selectSubset(id: string) {
    this.setState({ selectedSubset: id });
  }

  render() {
    let selectedSet = this.state.sets.find(set => set.id === this.state.selectedSet)!;
    let selectedSubset = selectedSet.subsets.find(subset => subset.id === this.state.selectedSubset)!;

    return (
      <ApiContext.Provider value={this.state.api}>
        <MathJaxContext
          hideUntilTypeset="every"
          version={3}
          config={{
            options: {
              enableMenu: false
            }
          }}>
          <div className="App">
            <Sets
              sets={this.state.sets}
              selectedSet={this.state.selectedSet}
              selectCallback={this.selectSet} />

            <Subsets
              set={selectedSet}
              selectedSubset={this.state.selectedSubset}
              selectCallback={this.selectSubset} />

            <Messages subset={selectedSubset} />
          </div>
        </MathJaxContext>
      </ApiContext.Provider>
    );
  }
}

export default App;
