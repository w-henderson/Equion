type SetData = {
  id: string;
  name: string;
  icon: string;
  admin: boolean;
  subsets: SubsetData[];
  members: UserData[];
  voiceMembers: VoiceUserData[]
}

type SubsetData = {
  id: string;
  name: string;
  messages?: MessageData[];
  loadedToTop?: boolean;
  unread?: boolean;
  typing?: TypingUser[];
}

type UserData = {
  uid: string;
  username: string;
  displayName: string;
  image?: string;
  bio?: string;
  online: boolean
}

type VoiceUserData = {
  peerId: string;
  speaking?: boolean;
  user: UserData;
  screenshare?: MediaStream
}

type TypingUser = {
  uid: string;
  lastTyped: number
}

type MessageData = {
  id: string;
  text: string;
  author: UserData;
  attachment: AttachmentData | null;
  timestamp: number
}

type AttachmentData = {
  id: string;
  name: string;
  type: string
}

type RegionData = {
  id: string;
  name: string;
  country: string;
  apiRoute: string;
  wsRoute: string;
  voice: {
    host: string;
    port: number
    secure: boolean;
    path: string
  }
}

type InviteData = {
  id: string;
  code: string;
  setId: string;
  setName: string;
  setIcon: string;
  created: number;
  expires: number | null;
  uses: number
}

/**
 * An event which occurs at the set level.
 */
type SetEvent<T> = {
  set: string,
  deleted: boolean,
  value: T,
}

/**
 * An event which occurs at the subset level.
 */
type SubsetEvent<T> = {
  set: string,
  subset: string,
  deleted: boolean,
  value: T,
}

/**
 * An event which occurs when a user types.
 */
type TypingEvent = {
  subset: string,
  uid: string
}

/**
 * A pong event.
 */
type PongEvent = {}

/**
 * An event which is emitted when the client is ready.
 */
type ReadyEvent = {}

/**
 * An event which is emitted when the client is disconnected.
 */
type DisconnectEvent = {}

/**
 * All the events which can take place.
 */
type Events = {
  ready: ReadyEvent;
  close: DisconnectEvent;
  pong: PongEvent;
  message: SubsetEvent<MessageData>;
  subset: SetEvent<SubsetData>;
  user: SetEvent<UserData>;
  voice: SetEvent<VoiceUserData>;
  typing: TypingEvent;
}

/**
 * A collection of event listeners.
 */
type Listeners<E> = {
  [K in keyof E]?: Array<(e: E[K]) => void>;
}