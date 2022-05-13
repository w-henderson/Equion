import React from 'react';
import './styles/App.scss';

import { confirm } from '@tauri-apps/api/dialog';
import { MathJaxContext } from 'better-react-mathjax';
import toast, { Toaster } from 'react-hot-toast';
import * as immutable from 'object-path-immutable';

import ApiContext from './api/ApiContext';
import Api from './api/Api';

import Sets from './components/Sets';
import Subsets from './components/Subsets';
import Messages from './components/Messages';
import AuthDialog from './components/AuthDialog';
import UserInfo from './components/UserInfo';
import Members from './components/Members';

interface AppState {
  init: boolean,
  authenticated: boolean,
  sets: SetData[],
  selectedSet: string | null,
  selectedSubset: string | null,
  shownUser: string | null
}

class App extends React.Component<{}, AppState> {
  api: Api;
  sets: React.RefObject<Sets>;

  constructor(props: {}) {
    super(props);

    this.api = new Api();

    this.api.onMessage = this.onMessage.bind(this);
    this.api.onSubset = this.onSubset.bind(this);
    this.api.onUpdateUser = this.onUpdateUser.bind(this);
    this.api.onLeftUser = this.onLeftUser.bind(this);

    this.state = {
      init: false,
      authenticated: false,
      sets: [],
      selectedSet: null,
      selectedSubset: null,
      shownUser: null
    }

    this.sets = React.createRef();

    this.showUser = this.showUser.bind(this);
    this.refresh = this.refresh.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onSubset = this.onSubset.bind(this);
    this.selectSet = this.selectSet.bind(this);
    this.selectSubset = this.selectSubset.bind(this);
    this.authComplete = this.authComplete.bind(this);
    this.createdSet = this.createdSet.bind(this);
    this.leaveSet = this.leaveSet.bind(this);
    this.requestMoreMessages = this.requestMoreMessages.bind(this);
  }

  componentDidMount() {
    this.api.init().then((authenticated) => this.setState({
      init: true,
      authenticated
    }));
  }

  authComplete() {
    this.api.getSets().then(sets => {
      this.setState({
        sets,
        authenticated: true
      }, () => {
        for (let set of sets) {
          this.api.subscriber.subscribe(this.api.token!, set.id);
        }
      });
    })
  }

  refresh() {
    this.api.getUserByUid(this.api.uid!).then(user => {
      this.api.image = user.image;
    });

    this.api.getSets().then(sets => {
      if (sets.findIndex(s => s.id === this.state.selectedSet) === -1) {
        this.setState({
          sets,
          selectedSet: null,
          selectedSubset: null
        });
      } else {
        this.setState({ sets }, this.requestMoreMessages);
      }
    });
  }

  showUser(id: string) {
    this.setState({
      shownUser: id
    });
  }

  createdSet(set: SetData) {
    this.setState(state => {
      return {
        ...state,
        sets: [...state.sets, set]
      }
    }, () => {
      this.api.subscriber.subscribe(this.api.token!, set.id);
      this.selectSet(set.id);
    });
  }

  leaveSet(id: string) {
    confirm("Are you sure you want to leave this set? You will not be able to rejoin unless invited.", "Leave set?").then(ok => {
      if (ok) {
        this.api.leaveSet(id).then(this.refresh, (e) => {
          toast.error(e);
        });
      }
    });
  }

  onMessage(message: MessageData, set: string, subset: string) {
    let setIndex = this.state.sets.findIndex(s => s.id === set)!;
    let subsetIndex = this.state.sets[setIndex].subsets.findIndex(s => s.id === subset)!;

    this.setState(state => {
      let newState = immutable.wrap(state);

      if (state.sets[setIndex].subsets[subsetIndex].messages === undefined) {
        newState.set(`sets.${setIndex}.subsets.${subsetIndex}.messages`, [message]);
      } else {
        newState.push(`sets.${setIndex}.subsets.${subsetIndex}.messages`, message);
      }

      return newState.value();
    });
  }

  onSubset(subset: SubsetData, set: string) {
    let setIndex = this.state.sets.findIndex(s => s.id === set)!;

    this.setState(state => {
      let newState = immutable.wrap(state);

      newState.push(`sets.${setIndex}.subsets`, subset);

      return newState.value();
    });
  }

  onUpdateUser(set: string, user: UserData) {
    this.setState(state => {
      let newState = immutable.wrap(state);

      let setIndex = state.sets.findIndex(s => s.id === set)!;
      let memberIndex = state.sets[setIndex].members.findIndex(m => m.uid === user.uid);

      if (memberIndex === -1) {
        newState.push(`sets.${setIndex}.members`, user);
      } else {
        newState.set(`sets.${setIndex}.members.${memberIndex}`, user);
      }

      return newState.value();
    }) // could refresh but not for now
  }

  onLeftUser(set: string, uid: string) {
    this.setState(state => {
      let newState = immutable.wrap(state);

      let setIndex = state.sets.findIndex(s => s.id === set)!;
      let memberIndex = state.sets[setIndex].members.findIndex(m => m.uid === uid);

      newState.del(`sets.${setIndex}.members.${memberIndex}`);

      return newState.value();
    }) // could refresh but not for now
  }

  selectSet(id: string) {
    let setIndex = this.state.sets.findIndex(set => set.id === id)!;

    this.selectSubset(id, this.state.sets[setIndex].subsets[0].id);
  }

  async selectSubset(set: string, subset: string) {
    let setIndex = this.state.sets.findIndex(s => s.id === set)!;
    let subsetIndex = this.state.sets[setIndex].subsets.findIndex(s => s.id === subset)!;

    this.setState({
      selectedSet: set,
      selectedSubset: subset
    }, () => {
      if (this.state.sets[setIndex].subsets[subsetIndex].messages === undefined) {
        this.requestMoreMessages();
      }
    });
  }

  async requestMoreMessages() {
    let setIndex = this.state.sets.findIndex(s => s.id === this.state.selectedSet);
    if (setIndex === -1) return;
    let subsetIndex = this.state.sets[setIndex].subsets.findIndex(s => s.id === this.state.selectedSubset);
    if (subsetIndex === -1) return;

    let oldest = undefined;
    if (this.state.sets[setIndex].subsets[subsetIndex].messages?.length !== 0) {
      oldest = this.state.sets[setIndex].subsets[subsetIndex].messages?.[0].id;
    }

    let messages = await this.api.getMessages(this.state.selectedSubset!, oldest);

    return new Promise<void>((resolve, _) => {
      this.setState(state => {
        let newState = immutable.wrap(state);

        if (messages.length < 25) {
          newState.set(["sets", setIndex, "subsets", subsetIndex, "loadedToTop"], true);
        }

        // Add newly-loaded messages to the start
        let newMessages = [
          ...messages,
          ...(state.sets[setIndex].subsets[subsetIndex].messages || [])
        ];

        newState.set(["sets", setIndex, "subsets", subsetIndex, "messages"], newMessages);

        return newState.value();
      }, resolve);
    });
  }

  render() {
    let selectedSet = this.state.sets.find(set => set.id === this.state.selectedSet);
    let selectedSubset = selectedSet?.subsets.find(subset => subset.id === this.state.selectedSubset);

    let inner = (
      <div className="App">
        <Sets
          ref={this.sets}
          sets={this.state.sets}
          selectedSet={this.state.selectedSet}
          showUserCallback={this.showUser}
          selectCallback={this.selectSet}
          createdCallback={this.createdSet} />

        {selectedSet &&
          <>
            <Subsets
              set={selectedSet}
              selectedSubset={this.state.selectedSubset}
              selectCallback={(s) => this.selectSubset(this.state.selectedSet!, s)} />

            <Messages
              subset={selectedSubset}
              requestMoreMessages={this.requestMoreMessages}
              showUser={this.showUser} />

            <Members
              set={selectedSet}
              userCallback={this.showUser}
              leaveCallback={() => this.leaveSet(selectedSet!.id)} />
          </>
        }

        {!selectedSet &&
          <>
            <div className="noSetSelected">
              <h1>Welcome to Equion</h1>
              <p>Select, join or create a set on the left to get started.</p>
            </div>
          </>
        }

        <UserInfo
          id={this.state.shownUser}
          hideCallback={() => this.setState({ shownUser: null })}
          refreshCallback={this.refresh} />

      </div>
    );
    ;

    if (!this.state.init) inner = <div className="App" />;

    if (this.state.init && !this.state.authenticated) {
      inner = (
        <ApiContext.Provider value={this.api}>
          <div className="App">
            <AuthDialog authComplete={this.authComplete} />
          </div>
        </ApiContext.Provider>
      )
    }

    return (
      <ApiContext.Provider value={this.api}>
        <MathJaxContext
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
