import React from "react";
import "./styles/App.scss";

import { confirm } from "@tauri-apps/api/dialog";
import { MathJaxContext } from "better-react-mathjax";
import toast, { Toaster } from "react-hot-toast";
import * as immutable from "object-path-immutable";

import ApiContext from "./api/ApiContext";
import Api from "./api/Api";

import { GLOBAL_STATE } from "./App";

import Sets from "./components/Sets";
import Subsets from "./components/Subsets";
import Messages from "./components/Messages";
import AuthDialog from "./components/AuthDialog";
import UserInfo from "./components/UserInfo";
import Members from "./components/Members";

interface OnlineAppProps {
  ws: WebSocket,
  region: RegionData,
  setRegion: (region: number) => void,
  ping: number | null,
  onPong: () => void
}

interface OnlineAppState {
  init: boolean,
  authenticated: boolean,
  sets: SetData[],
  selectedSet: string | null,
  selectedSubset: string | null,
  shownUser: string | null
}

/**
 * Component for the main app with internet access.
 */
class OnlineApp extends React.Component<OnlineAppProps, OnlineAppState> {
  api: Api;
  sets: React.RefObject<Sets>;

  /**
   * Initializes the online app.
   */
  constructor(props: OnlineAppProps) {
    super(props);

    this.api = new Api(props.ws, props.region, props.onPong);

    this.api.onShow = this.onShow.bind(this);
    this.api.onMessage = this.onMessage.bind(this);
    this.api.onSubset = this.onSubset.bind(this);
    this.api.onUpdateUser = this.onUpdateUser.bind(this);
    this.api.onLeftUser = this.onLeftUser.bind(this);
    this.api.onUserJoinedVoiceChannel = this.onUserJoinedVoiceChannel.bind(this);
    this.api.onUserLeftVoiceChannel = this.onUserLeftVoiceChannel.bind(this);
    this.api.onUserTyping = this.onTypingChange.bind(this);

    this.api.voice.allowedToCall = this.allowedToCall.bind(this);
    this.api.voice.onSpeakingChange = this.onSpeakingChange.bind(this);
    this.api.voice.onNewScreenshare = this.onNewScreenshare.bind(this);
    this.api.voice.onEndScreenshare = this.onEndScreenshare.bind(this);

    this.state = {
      init: false,
      authenticated: false,
      sets: [],
      selectedSet: null,
      selectedSubset: null,
      shownUser: null
    };

    this.sets = React.createRef();

    this.allowedToCall = this.allowedToCall.bind(this);
    this.showUser = this.showUser.bind(this);
    this.refresh = this.refresh.bind(this);
    this.onShow = this.onShow.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onSubset = this.onSubset.bind(this);
    this.selectSet = this.selectSet.bind(this);
    this.selectSubset = this.selectSubset.bind(this);
    this.authComplete = this.authComplete.bind(this);
    this.createdSet = this.createdSet.bind(this);
    this.leaveSet = this.leaveSet.bind(this);
    this.requestMoreMessages = this.requestMoreMessages.bind(this);
    this.onUserJoinedVoiceChannel = this.onUserJoinedVoiceChannel.bind(this);
    this.onUserLeftVoiceChannel = this.onUserLeftVoiceChannel.bind(this);
    this.onSpeakingChange = this.onSpeakingChange.bind(this);
    this.onNewScreenshare = this.onNewScreenshare.bind(this);
    this.onEndScreenshare = this.onEndScreenshare.bind(this);
  }

  /**
   * When the app has rendered, initialize the API.
   */
  componentDidMount() {
    if (GLOBAL_STATE.rendered) return;
    GLOBAL_STATE.rendered = true;

    this.api.init().then(authenticated => {
      if (authenticated) {
        if (this.api.uid === null || this.api.token === null) return toast.error("Failed to authenticate.");

        toast.promise(this.api.finishAuth(this.api.uid, this.api.token).then(this.authComplete), {
          loading: "Loading previous session...",
          success: "Loaded previous session!",
          error: "Failed to load previous session."
        });

      } else {
        this.setState({
          init: true,
          authenticated
        });
      }
    });
  }

  /**
   * Upon completion of authentication, load the user's sets and subscribe to events for them.
   */
  authComplete() {
    this.api.getSets().then(sets => {
      this.setState({
        sets,
        init: true,
        authenticated: true
      }, () => {
        if (!this.api.token) return;

        for (const set of sets) {
          this.api.subscriber.subscribe(this.api.token, set.id);
        }
      });
    });
  }

  /**
   * Refresh the application's data.
   */
  refresh() {
    if (!this.api.uid) return;

    this.api.getUserByUid(this.api.uid).then(user => {
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

  /**
   * Show the user with the given ID in the user info dialog.
   */
  showUser(id: string) {
    this.setState({
      shownUser: id
    });
  }

  /**
   * Check whether the peer is allowed to call the user.
   * 
   * This prevents unauthorized users from joining voice chats, since the actual PeerJS connection is stateless.
   */
  allowedToCall(id: string): boolean {
    if (this.api.voice.currentChannel !== null) {
      const setIndex = this.state.sets.findIndex(s => s.id === this.api.voice.currentChannel);
      if (setIndex === -1) return false;

      const userIndex = this.state.sets[setIndex].voiceMembers.findIndex(u => u.peerId === id);

      return userIndex !== -1;
    }

    return false;
  }

  /**
   * Update the sets when a new set is created.
   */
  createdSet(set: SetData) {
    this.setState(state => {
      return {
        ...state,
        sets: [...state.sets, set]
      };
    }, () => {
      if (this.api.token) this.api.subscriber.subscribe(this.api.token, set.id);
      this.selectSet(set.id);
    });
  }

  /**
   * Leave the given set, requesting confirmation.
   */
  leaveSet(id: string) {
    confirm("Are you sure you want to leave this set? You will not be able to rejoin unless invited.", "Leave set?").then(ok => {
      if (ok) {
        this.api.leaveSet(id).then(this.refresh, (e) => {
          toast.error(e);
        });
      }
    });
  }

  /**
   * When a subset is selected, update the state as well as the tray icon if necessary.
   */
  onShow() {
    const setIndex = this.state.sets.findIndex(s => s.id === this.state.selectedSet);
    if (setIndex === -1) return;
    const subsetIndex = this.state.sets[setIndex].subsets.findIndex(s => s.id === this.state.selectedSubset);
    if (subsetIndex === -1) return;

    this.setState(state => {
      const newState = immutable.wrap(state);

      const subset = {
        ...state.sets[setIndex].subsets[subsetIndex],
        unread: false
      };

      newState.set(`sets.${setIndex}.subsets.${subsetIndex}`, subset);

      return newState.value();
    }, () => {
      const unreadMessages = this.state.sets.reduce((acc1, set) => acc1 || set.subsets.reduce((acc2, subset) => acc2 || (subset.unread ?? false), false), false);

      this.api.setTrayIcon(unreadMessages ? "notification" : "default");
    });
  }

  /**
   * When a message is received, display it or store it.
   */
  onMessage(message: MessageData, set: string, subset: string) {
    const setIndex = this.state.sets.findIndex(s => s.id === set);
    const subsetIndex = this.state.sets[setIndex].subsets.findIndex(s => s.id === subset);

    if (this.state.selectedSubset !== subset || this.api.minimisedToTray) {
      this.api.notifier.notify(message);
    }

    this.setState(state => {
      const newState = immutable.wrap(state);

      if (state.sets[setIndex].subsets[subsetIndex].messages === undefined) {
        newState.set(`sets.${setIndex}.subsets.${subsetIndex}.messages`, [message]);
      } else {
        newState.push(`sets.${setIndex}.subsets.${subsetIndex}.messages`, message);
      }

      if (this.state.selectedSubset !== subset || this.api.minimisedToTray) {
        newState.set(`sets.${setIndex}.subsets.${subsetIndex}.unread`, true);
      }

      const typingIndex = (state.sets[setIndex].subsets[subsetIndex].typing ?? []).findIndex(u => u.uid === message.author.uid);

      if (typingIndex !== -1) {
        newState.del(`sets.${setIndex}.subsets.${subsetIndex}.typing.${typingIndex}`);
      }

      return newState.value();
    }, () => {
      const unreadMessages = this.state.sets.reduce((acc1, set) => acc1 || set.subsets.reduce((acc2, subset) => acc2 || (subset.unread ?? false), false), false);

      this.api.setTrayIcon(unreadMessages ? "notification" : "default");
    });
  }

  /**
   * When a new subset is created, add it to the state.
   */
  onSubset(subset: SubsetData, set: string) {
    const setIndex = this.state.sets.findIndex(s => s.id === set);

    this.setState(state => {
      const newState = immutable.wrap(state);

      newState.push(`sets.${setIndex}.subsets`, subset);

      return newState.value();
    });
  }

  /**
   * When a user's details are updated, update the state.
   */
  onUpdateUser(set: string, user: UserData) {
    this.setState(state => {
      const newState = immutable.wrap(state);

      const setIndex = state.sets.findIndex(s => s.id === set);
      const memberIndex = state.sets[setIndex].members.findIndex(m => m.uid === user.uid);

      if (memberIndex === -1) {
        newState.push(`sets.${setIndex}.members`, user);
      } else {
        newState.set(`sets.${setIndex}.members.${memberIndex}`, user);
      }

      return newState.value();
    }); // could refresh but not for now
  }

  /**
   * When a user leaves a set, remove them from the state.
   */
  onLeftUser(set: string, uid: string) {
    this.setState(state => {
      const newState = immutable.wrap(state);

      const setIndex = state.sets.findIndex(s => s.id === set);
      const memberIndex = state.sets[setIndex].members.findIndex(m => m.uid === uid);

      newState.del(`sets.${setIndex}.members.${memberIndex}`);

      return newState.value();
    }); // could refresh but not for now
  }

  /**
   * When a user joins the voice channel, add them to the state.
   * 
   * If the user is the current user, start the initialisation process for the voice chat by connecting to the peers.
   */
  onUserJoinedVoiceChannel(set: string, user: VoiceUserData) {
    if (user.user.uid === this.api.uid) {
      const setIndex = this.state.sets.findIndex(s => s.id === set);
      const peers = this.state.sets[setIndex].voiceMembers.map(peer => peer.peerId);
      this.api.voice.connectToPeers(peers);
    }

    this.setState(state => {
      const newState = immutable.wrap(state);

      const setIndex = state.sets.findIndex(s => s.id === set);
      if (setIndex === -1) return state;

      newState.push(`sets.${setIndex}.voiceMembers`, user);

      return newState.value();
    });
  }

  /**
   * When a user leaves the voice channel, remove them from the state.
   * 
   * If the user is the current user, close the WebRTC connections.
   */
  onUserLeftVoiceChannel(set: string, uid: string) {
    if (uid === this.api.uid) {
      this.api.voice.disconnect();
    }

    const setIndex = this.state.sets.findIndex(s => s.id === set);
    const peerId = this.state.sets[setIndex].voiceMembers.find(m => m.user.uid === uid)?.peerId;

    if (peerId) {
      this.api.voice.disconnectPeer(peerId);
    }

    this.setState(state => {
      const newState = immutable.wrap(state);

      const setIndex = state.sets.findIndex(s => s.id === set);
      if (setIndex === -1) return state;

      const voiceMembers = state.sets[setIndex].voiceMembers.filter(m => m.user.uid !== uid);

      newState.set(`sets.${setIndex}.voiceMembers`, voiceMembers);

      return newState.value();
    });
  }

  /**
   * Updates the state with a new screenshare.
   */
  onNewScreenshare(peerId: string, stream: MediaStream) {
    this.setState(state => {
      const newState = immutable.wrap(state);

      const setIndex = state.sets.findIndex(s => s.voiceMembers.some(m => m.peerId === peerId));
      if (setIndex === -1) return state;

      const memberIndex = state.sets[setIndex].voiceMembers.findIndex(m => m.peerId === peerId);
      if (memberIndex === -1) return state;

      newState.set(`sets.${setIndex}.voiceMembers.${memberIndex}.screenshare`, stream);

      return newState.value();
    });
  }

  /**
   * Removes an ended screenshare.
   */
  onEndScreenshare(peerId: string) {
    this.setState(state => {
      const newState = immutable.wrap(state);

      const setIndex = state.sets.findIndex(s => s.voiceMembers.some(m => m.peerId === peerId));
      if (setIndex === -1) return state;

      const memberIndex = state.sets[setIndex].voiceMembers.findIndex(m => m.peerId === peerId);
      if (memberIndex === -1) return state;

      newState.set(`sets.${setIndex}.voiceMembers.${memberIndex}.screenshare`, undefined);

      return newState.value();
    });
  }

  /**
   * When a user starts or stops speaking, update the state.
   */
  onSpeakingChange(speaking: boolean, peerId: string) {
    this.setState(state => {
      const newState = immutable.wrap(state);

      const setIndex = state.sets.findIndex(s => s.voiceMembers.some(m => m.peerId === peerId));
      if (setIndex === -1) return state;

      const memberIndex = state.sets[setIndex].voiceMembers.findIndex(m => m.peerId === peerId);
      if (memberIndex === -1) return state;

      newState.set(`sets.${setIndex}.voiceMembers.${memberIndex}.speaking`, speaking);

      return newState.value();
    });
  }

  /**
   * When a user starts or stops typing, update the state.
   */
  onTypingChange(subset: string, uid: string) {
    if (this.api.uid === uid) return;

    this.setState(state => {
      const newState = immutable.wrap(state);

      const setIndex = state.sets.findIndex(set => set.subsets.some(s => s.id === subset));
      if (setIndex === -1) return state;

      const subsetIndex = state.sets[setIndex].subsets.findIndex(s => s.id === subset);
      if (subsetIndex === -1) return state;

      if (state.sets[setIndex].subsets[subsetIndex].typing !== undefined) {
        const typingIndex = state.sets[setIndex].subsets[subsetIndex].typing!.findIndex(t => t.uid === uid);

        if (typingIndex === -1) {
          newState.push(`sets.${setIndex}.subsets.${subsetIndex}.typing`, {
            uid,
            lastTyped: new Date().getTime()
          });
        } else {
          newState.set(`sets.${setIndex}.subsets.${subsetIndex}.typing.${typingIndex}.lastTyped`, new Date().getTime());
        }
      } else {
        newState.set(`sets.${setIndex}.subsets.${subsetIndex}.typing`, [{
          uid,
          lastTyped: new Date().getTime()
        }]);
      }

      return newState.value();
    });
  }

  /**
   * Selects the set with the given ID.
   */
  selectSet(id: string) {
    const setIndex = this.state.sets.findIndex(set => set.id === id);

    if (setIndex === -1) return;

    this.selectSubset(id, this.state.sets[setIndex].subsets[0].id);
  }

  /**
   * Selects the subset of the given set with the given ID.
   */
  async selectSubset(set: string, subset: string) {
    const setIndex = this.state.sets.findIndex(s => s.id === set);
    if (setIndex === -1) return;

    const subsetIndex = this.state.sets[setIndex].subsets.findIndex(s => s.id === subset);
    if (subsetIndex === -1) return;

    this.setState(state => {
      const newState = immutable.wrap(state);

      newState.set(`sets.${setIndex}.subsets.${subsetIndex}.unread`, false);
      newState.set("selectedSet", set);
      newState.set("selectedSubset", subset);

      return newState.value();
    }, () => {
      if (this.state.sets[setIndex].subsets[subsetIndex].messages === undefined
        || ((this.state.sets[setIndex].subsets[subsetIndex].messages ?? []).length < 25
          && this.state.sets[setIndex].subsets[subsetIndex].loadedToTop !== true)) {
        this.requestMoreMessages();
      }
    });
  }

  /**
   * Requests earlier messages for the current subset.
   */
  async requestMoreMessages() {
    if (this.state.selectedSubset === null) return;

    const setIndex = this.state.sets.findIndex(s => s.id === this.state.selectedSet);
    if (setIndex === -1) return;
    const subsetIndex = this.state.sets[setIndex].subsets.findIndex(s => s.id === this.state.selectedSubset);
    if (subsetIndex === -1) return;

    let oldest = undefined;
    if (this.state.sets[setIndex].subsets[subsetIndex].messages?.length !== 0) {
      oldest = this.state.sets[setIndex].subsets[subsetIndex].messages?.[0].id;
    }

    const messages = await this.api.getMessages(this.state.selectedSubset, oldest);

    return new Promise<void>((resolve) => {
      this.setState(state => {
        const newState = immutable.wrap(state);

        if (messages.length < 25) {
          newState.set(["sets", setIndex, "subsets", subsetIndex, "loadedToTop"], true);
        }

        // Add newly-loaded messages to the start
        const newMessages = [
          ...messages,
          ...(state.sets[setIndex].subsets[subsetIndex].messages || [])
        ];

        newState.set(["sets", setIndex, "subsets", subsetIndex, "messages"], newMessages);

        return newState.value();
      }, resolve);
    });
  }

  /**
   * Renders the component.
   */
  render() {
    const selectedSet = this.state.sets.find(set => set.id === this.state.selectedSet);
    const selectedSubset = selectedSet?.subsets.find(subset => subset.id === this.state.selectedSubset);

    let inner = (
      <div className="App">
        <Sets
          ref={this.sets}
          sets={this.state.sets}
          ping={this.props.ping}
          selectedSet={this.state.selectedSet}
          showUserCallback={this.showUser}
          selectCallback={this.selectSet}
          createdCallback={this.createdSet} />

        {selectedSet &&
          <>
            <Subsets
              set={selectedSet}
              selectedSubset={this.state.selectedSubset}
              selectCallback={(s) => {
                if (this.state.selectedSet !== null) this.selectSubset(this.state.selectedSet, s);
              }} />

            <Messages
              subset={selectedSubset}
              requestMoreMessages={this.requestMoreMessages}
              members={selectedSet.members}
              showUser={this.showUser} />

            <Members
              set={selectedSet}
              userCallback={this.showUser}
              leaveCallback={() => {
                if (selectedSet !== undefined) this.leaveSet(selectedSet.id);
              }} />
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


    if (!this.state.init) inner = <div className="App" />;

    if (this.state.init && !this.state.authenticated) {
      inner = (
        <ApiContext.Provider value={this.api}>
          <div className="App">
            <AuthDialog
              authComplete={this.authComplete}
              region={this.props.region}
              setRegion={this.props.setRegion} />
          </div>
        </ApiContext.Provider>
      );
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

export default OnlineApp;
