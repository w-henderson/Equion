interface SetData {
  id: string,
  name: string,
  icon: string,
  admin: boolean,
  subsets: SubsetData[]
}

interface SubsetData {
  id: string,
  name: string,
  messages?: MessageData[],
  loadedToTop?: boolean
}

interface UserData {
  id: string,
  username: string,
  displayName: string,
  image?: string,
  bio?: string,
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