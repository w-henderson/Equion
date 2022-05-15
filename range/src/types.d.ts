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
  unread?: boolean
}

interface UserData {
  uid: string,
  username: string,
  displayName: string,
  image?: string,
  bio?: string,
}

interface VoiceUserData {
  peerId: string,
  user: UserData
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