import React from 'react';
import './styles/App.scss';

import { MathJaxContext } from 'better-react-mathjax';
import { Toaster } from 'react-hot-toast';

import ApiContext from './api/ApiContext';
import Api from './api/Api';

import Sets from './components/Sets';
import Subsets from './components/Subsets';
import Messages from './components/Messages';
import AuthDialog from './components/AuthDialog';

interface AppState {
  init: boolean,
  authenticated: boolean,
  sets: SetData[],
  selectedSet: string | null,
  selectedSubset: string | null
}

class App extends React.Component<{}, AppState> {
  api: Api;

  constructor(props: {}) {
    super(props);

    this.api = new Api();

    this.state = {
      init: false,
      authenticated: false,
      sets: [],
      selectedSet: null,
      selectedSubset: null
    }

    this.selectSet = this.selectSet.bind(this);
    this.selectSubset = this.selectSubset.bind(this);
    this.authComplete = this.authComplete.bind(this);
  }

  componentDidMount() {
    this.api.init().then((authenticated) => this.setState({
      init: true,
      authenticated
    }));
  }

  authComplete() {
    this.setState({
      authenticated: true
    });
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
    let selectedSet = this.state.sets.find(set => set.id === this.state.selectedSet);
    let selectedSubset = selectedSet?.subsets.find(subset => subset.id === this.state.selectedSubset);

    let inner = (
      <div className="App">
        <Sets
          sets={this.state.sets}
          selectedSet={this.state.selectedSet}
          selectCallback={this.selectSet} />

        <Subsets
          set={selectedSet}
          selectedSubset={this.state.selectedSubset}
          selectCallback={this.selectSubset} />

        <Messages
          subset={selectedSubset} />
      </div>
    );
    ;

    if (!this.state.init) inner = <div className="App" />;

    if (this.state.init && !this.state.authenticated) {
      inner = (
        <ApiContext.Provider value={this.api}>
          <div className="App">
            <Sets
              sets={[]}
              selectedSet={null}
              selectCallback={() => { }} />

            <AuthDialog authComplete={this.authComplete} />
          </div>
        </ApiContext.Provider>
      )
    }

    return (
      <ApiContext.Provider value={this.api}>
        <MathJaxContext
          hideUntilTypeset="every"
          version={3}
          config={{
            options: {
              enableMenu: false
            }
          }}>

          {inner}

          <Toaster position="bottom-center" toastOptions={{
            style: {
              background: "#293f55", // var(--accent)
              color: "#fff",
              minWidth: "350px",
              maxWidth: "1000px"
            }
          }} />
        </MathJaxContext>
      </ApiContext.Provider>
    );
  }
}

export default App;
