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