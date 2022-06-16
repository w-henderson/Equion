interface SetData {
  id: string,
  name: string,
  icon: string,
  admin: boolean,
  subsets: SubsetData[],
  members: UserData[],
  voiceMembers: VoiceUserData[]
}

interface SubsetData {
  id: string,
  name: string,
  messages?: MessageData[],
  loadedToTop?: boolean,
  unread?: boolean,
  typing?: TypingUser[],
}

interface UserData {
  uid: string,
  username: string,
  displayName: string,
  image?: string,
  bio?: string,
  online: boolean
}

interface VoiceUserData {
  peerId: string,
  speaking?: boolean,
  user: UserData,
  screenshare?: MediaStream
}

interface TypingUser {
  uid: string,
  lastTyped: number
}

interface MessageData {
  id: string,
  text: string,
  author: UserData,
  attachment: AttachmentData | null,
  timestamp: number
}

interface AttachmentData {
  id: string,
  name: string,
  type: string
}

interface RegionData {
  id: string,
  name: string,
  country: string,
  apiRoute: string,
  wsRoute: string,
  voice: {
    host: string,
    port: number
    secure: boolean,
    path: string
  }
}

interface InviteData {
  id: string,
  code: string,
  setId: string,
  setName: string,
  setIcon: string,
  created: number,
  expires: number | null,
  uses: number
}