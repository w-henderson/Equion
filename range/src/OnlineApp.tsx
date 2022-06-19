import React from "react";
import "./styles/App.scss";

import EquionClient from "equion-api";

import { confirm } from "@tauri-apps/api/dialog";
import { listen, Event as TauriEvent } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import { MathJaxContext } from "better-react-mathjax";
import toast, { Toaster } from "react-hot-toast";
import * as immutable from "object-path-immutable";

import ApiContext from "./api/ApiContext";
import Api from "./api/Api";
import { SetEvent, SubsetEvent } from "./api/Subscriber";

import { GLOBAL_STATE } from "./App";

import Sets from "./components/Sets";
import Subsets from "./components/Subsets";
import Messages from "./components/Messages";
import AuthDialog from "./components/AuthDialog";
import UserInfo from "./components/UserInfo";
import Members from "./components/Members";
import InviteDialog from "./components/InviteDialog";

interface OnlineAppProps {
  client: EquionClient,
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
  inviteDialog: React.RefObject<InviteDialog>;
  unlisten?: () => void;

  /**
   * Initializes the online app.
   */
  constructor(props: OnlineAppProps) {
    super(props);

    this.api = new Api(props.client, props.region, props.onPong);

    this.api.onShow = this.onShow.bind(this);
    this.api.onMessage = this.onMessage.bind(this);
    this.api.onSubset = this.onSubset.bind(this);
    this.api.onUser = this.onUser.bind(this);
    this.api.onVoice = this.onVoice.bind(this);
    this.api.onTyping = this.onTyping.bind(this);

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
    this.inviteDialog = React.createRef();

    this.showUser = this.showUser.bind(this);
    this.refresh = this.refresh.bind(this);
    this.selectSet = this.selectSet.bind(this);
    this.selectSubset = this.selectSubset.bind(this);
    this.authComplete = this.authComplete.bind(this);
    this.createdSet = this.createdSet.bind(this);
    this.leaveSet = this.leaveSet.bind(this);
    this.requestMoreMessages = this.requestMoreMessages.bind(this);
  }

  /**
   * When the app has rendered, initialize the API.
   */
  async componentDidMount() {
    if (GLOBAL_STATE.rendered) return;
    GLOBAL_STATE.rendered = true;

    if (this.unlisten === undefined && window.__TAURI_IPC__ !== undefined) {
      this.unlisten = await listen("deep-link", this.onDeepLink.bind(this));
    }

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
   * Cleans up the component.
   */
  componentWillUnmount() {
    if (this.unlisten !== undefined) this.unlisten();
  }

  /**
   * Handler for deep links.
   */
  onDeepLink(e: TauriEvent<string>) {
    if (this.state.authenticated) {
      const payload = e.payload.replace("equion://", "");
      const [command, data] = payload.split("/", 2);

      if (command === "invite" && this.inviteDialog.current) {
        this.inviteDialog.current.show(data);
      } else {
        toast.error(`Unknown link command: ${command}`);
      }
    } else {
      toast.error("You need to be logged in before you can do that!");
    }
  }

  /**
   * Upon completion of authentication, load the user's sets and subscribe to events for them.
   */
  async authComplete() {
    await this.api.finishAuth(this.api.uid!, this.api.token!);

    this.api.client.sets().then(sets => {
      this.setState({
        sets,
        init: true,
        authenticated: true
      }, () => {
        for (const set of sets) {
          this.api.client.subscribe(set.id);
        }
      });
    });
  }

  /**
   * Refresh the application's data.
   */
  refresh() {
    if (!this.api.uid) return;

    this.api.client.user(this.api.uid).then(user => {
      this.api.image = user.image;
    });

    this.api.client.sets().then(sets => {
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
      this.api.client.subscribe(set.id);
      this.selectSet(set.id);
    });
  }

  /**
   * Leave the given set, requesting confirmation.
   */
  async leaveSet(id: string) {
    const message = "Are you sure you want to leave this set? You will not be able to rejoin unless invited.";
    const leave = window.__TAURI_IPC__ !== undefined ? await confirm(message, "Leave set?") : window.confirm(message);

    if (leave) {
      this.api.client.leaveSet(id).then(this.refresh, (e) => {
        toast.error(e);
      });
    }
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
   * When a message is received, edited or deleted, display it or store it.
   */
  onMessage(e: SubsetEvent<MessageData>) {
    const setIndex = this.state.sets.findIndex(s => s.id === e.set);
    const subsetIndex = this.state.sets[setIndex].subsets.findIndex(s => s.id === e.subset);
    const messageIndex = (this.state.sets[setIndex].subsets[subsetIndex].messages ?? []).findIndex(m => m.id === e.value.id);

    if ((this.state.selectedSubset !== e.subset || this.api.minimisedToTray) && messageIndex === -1) {
      this.api.notifier.notify(e.value);
    }

    this.setState(state => {
      const newState = immutable.wrap(state);

      if (state.sets[setIndex].subsets[subsetIndex].messages === undefined) {
        if (e.deleted) return state;

        newState.set(`sets.${setIndex}.subsets.${subsetIndex}.messages`, [e.value]);
      } else {
        if (e.deleted) {
          newState.del(`sets.${setIndex}.subsets.${subsetIndex}.messages.${messageIndex}`);
        } else {
          if (messageIndex === -1) {
            newState.push(`sets.${setIndex}.subsets.${subsetIndex}.messages`, e.value);
          } else {
            newState.set(`sets.${setIndex}.subsets.${subsetIndex}.messages.${messageIndex}`, e.value);
          }
        }
      }

      if ((this.state.selectedSubset !== e.subset || this.api.minimisedToTray) && messageIndex === -1) {
        newState.set(`sets.${setIndex}.subsets.${subsetIndex}.unread`, true);
      }

      const typingIndex = (state.sets[setIndex].subsets[subsetIndex].typing ?? []).findIndex(u => u.uid === e.value.author.uid);

      if (typingIndex !== -1) {
        newState.del(`sets.${setIndex}.subsets.${subsetIndex}.typing.${typingIndex}`);
      }

      return newState.value();
    }, () => {
      const unreadMessages = this.state.sets.some(set => set.subsets.some(subset => subset.unread ?? false));

      this.api.setTrayIcon(unreadMessages ? "notification" : "default");
    });
  }

  /**
   * When a subset is created, updated or deleted, change it in the state.
   */
  onSubset(e: SetEvent<SubsetData>) {
    this.setState(state => {
      const setIndex = state.sets.findIndex(s => s.id === e.set);
      const subsetIndex = state.sets[setIndex].subsets.findIndex(s => s.id === e.value.id);

      const newState = immutable.wrap(state);

      if (e.deleted) {
        newState.del(`sets.${setIndex}.subsets.${subsetIndex}`);

        if (state.selectedSubset === e.value.id) {
          newState.set("selectedSubset", null);
        }
      } else if (subsetIndex === -1) {
        newState.push(`sets.${setIndex}.subsets`, e.value);
      } else {
        newState.set(`sets.${setIndex}.subsets.${subsetIndex}.name`, e.value.name);
      }

      return newState.value();
    });
  }

  /**
   * When a user joins, leaves or updates their details, reflect this in the state.
   */
  onUser(e: SetEvent<UserData>) {
    this.setState(state => {
      const setIndex = state.sets.findIndex(s => s.id === e.set);
      const memberIndex = state.sets[setIndex].members.findIndex(m => m.uid === e.value.uid);

      const newState = immutable.wrap(state);

      if (e.deleted) {
        newState.del(`sets.${setIndex}.members.${memberIndex}`);
      } else if (memberIndex === -1) {
        newState.push(`sets.${setIndex}.members`, e.value);
      } else {
        newState.set(`sets.${setIndex}.members.${memberIndex}`, e.value);
      }

      return newState.value();
    }); // could refresh but not for now
  }

  /**
   * When a user joins, leaves, or changes their details in the voice channel, update this in the state.
   * 
   * If the user is the current user and has joined, start the initialisation process for the voice chat by connecting to the peers.
   * If the user is the current user and has left, close any existing WebRTC connections.
   */
  onVoice(e: SetEvent<VoiceUserData>) {
    const setIndex = this.state.sets.findIndex(s => s.id === e.set);
    const memberIndex = this.state.sets[setIndex].voiceMembers.findIndex(m => m.user.uid === e.value.user.uid);
    const peerId = this.state.sets[setIndex].voiceMembers.find(m => m.user.uid === e.value.user.uid)?.peerId;

    if (e.value.user.uid === this.api.uid && peerId === undefined) {
      const peers = this.state.sets[setIndex].voiceMembers.map(peer => peer.peerId);
      this.api.voice.connectToPeers(peers);
    } else if (e.value.user.uid === this.api.uid && e.deleted) {
      this.api.voice.disconnect();
    }

    if (e.deleted && peerId) {
      this.api.voice.disconnectPeer(peerId);
    }

    this.setState(state => {
      const newState = immutable.wrap(state);

      if (e.deleted) {
        newState.del(`sets.${setIndex}.voiceMembers.${memberIndex}`);
      } else if (memberIndex === -1) {
        newState.push(`sets.${setIndex}.voiceMembers`, e.value);
      } else {
        newState.set(`sets.${setIndex}.voiceMembers.${memberIndex}`, e.value);
      }

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
  onTyping(e: TypingEvent) {
    if (this.api.uid === e.uid) return;

    this.setState(state => {
      const newState = immutable.wrap(state);

      const setIndex = state.sets.findIndex(set => set.subsets.some(s => s.id === e.subset));
      if (setIndex === -1) return state;

      const subsetIndex = state.sets[setIndex].subsets.findIndex(s => s.id === e.subset);
      if (subsetIndex === -1) return state;

      if (state.sets[setIndex].subsets[subsetIndex].typing !== undefined) {
        const typingIndex = state.sets[setIndex].subsets[subsetIndex].typing!.findIndex(t => t.uid === e.uid);

        if (typingIndex === -1) {
          newState.push(`sets.${setIndex}.subsets.${subsetIndex}.typing`, {
            uid: e.uid,
            lastTyped: new Date().getTime()
          });
        } else {
          newState.set(`sets.${setIndex}.subsets.${subsetIndex}.typing.${typingIndex}.lastTyped`, new Date().getTime());
        }
      } else {
        newState.set(`sets.${setIndex}.subsets.${subsetIndex}.typing`, [{
          uid: e.uid,
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

    const messages = await this.api.client.messages(this.state.selectedSubset, oldest);

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
          createdCallback={this.createdSet}
          joinCallback={id => { if (this.inviteDialog.current) this.inviteDialog.current.show(id); }}
          leaveCallback={this.leaveSet} />

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
              userCallback={this.showUser} />
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

        <InviteDialog
          ref={this.inviteDialog}
          joinCallback={this.createdSet} />
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

          <div className="windowButtons">
            <div className="close" onClick={() => this.api.minimiseToTray()} />
            <div className="minimise" onClick={() => appWindow.minimize()} />
            <div className="maximise" onClick={() => appWindow.toggleMaximize()} />
          </div>

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
