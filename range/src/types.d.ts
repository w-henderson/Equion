interface SetData {
  id: string,
  name: string,
  icon: string,
  subsets: SubsetData[]
}

interface SubsetData {
  id: string,
  name: string,
  messages?: MessageData[]
}

interface UserData {
  id: string,
  name: string,
  image: string
}

interface MessageData {
  id: string,
  text: string,
  author: UserData,
  timestamp: number
}