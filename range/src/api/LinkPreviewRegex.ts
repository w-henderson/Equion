export interface LinkPreviewProvider {
  name: string,
  regex: RegExp,
  type: "image" | "iframe",
  url: string,
  width: number,
  height: number
}

export const PROVIDERS: LinkPreviewProvider[] = [
  {
    name: "youtube",
    regex: /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/,
    type: "iframe",
    url: "https://www.youtube.com/embed/{{id}}",
    width: 560,
    height: 315
  },
  {
    name: "lichess",
    regex: /^https?:\/\/lichess\.org\/([a-zA-Z0-9]{8})[a-zA-Z0-9]*$/,
    type: "iframe",
    url: "https://lichess.org/embed/{{id}}?theme=blue2&bg=dark",
    width: 600,
    height: 397
  },
];