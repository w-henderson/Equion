const SEGMENT_REGEX = {
  blockLatex: /\\\[(.*?)\\\]/g,
  inlineLatex: /\\\((.*?)\\\)/g,
  bold: /\*\*(.*?)\*\*/g,
  italic: /(?<!\*)\*(?!\*)(.*?)\*/g,
  underline: /__(.*?)__/g,
  strike: /~~(.*?)~~/g,
  ping: /<@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>/g
}

export enum MessageSegmentType {
  Plain = "plain",
  BlockLatex = "blockLatex",
  InlineLatex = "inlineLatex",
  Bold = "bold",
  Italic = "italic",
  Underline = "underline",
  Strike = "strike",
  Ping = "ping",
  Unparsed = "unparsed"
}

export interface MessageSegment {
  type: MessageSegmentType,
  value: string
}

export class MessageParser {
  private message: MessageSegment[];

  constructor(message: string) {
    this.message = [{
      type: MessageSegmentType.Unparsed,
      value: message
    }];
  }

  parse(): MessageSegment[] {
    while (this.message.reduce((acc, segment) => acc || segment.type === "unparsed", false)) {
      this.performPass();
    }

    return this.message;
  }

  private performPass() {
    this.message = this.message.map(segment => {
      if (segment.type === "unparsed") {
        // If the segment is yet to be parsed, parse it.

        let location = -1;
        let regex = null;
        let type = null;

        for (let [newType, newRegex] of Object.entries(SEGMENT_REGEX)) {
          let newLocation = segment.value.search(newRegex);
          if (newLocation !== -1) {
            location = newLocation;
            regex = newRegex;
            type = newType;
          }
        }

        if (location !== -1 && regex !== null && type !== null) {
          // If the segment was matched by a regular expression, parse it.

          let beforeMatch = segment.value.substring(0, location); // The part before the match.
          let match = segment.value.split(regex)[1]; // The matched part without the surrounding stuff (hence why split instead of match).
          let afterMatch = segment.value.substring(location + segment.value.match(regex)![0].length); // The part after the match.

          return [
            {
              type: MessageSegmentType.Unparsed,
              value: beforeMatch
            },
            {
              type: type as MessageSegmentType,
              value: match
            },
            {
              type: MessageSegmentType.Unparsed,
              value: afterMatch
            }
          ]
        } else {
          // If the segment was not matched, mark it as plain text.

          return [{
            type: MessageSegmentType.Plain,
            value: segment.value
          }];
        }
      } else {
        // If the segment has already been parsed, leave it unchanged.

        return [segment];
      }
    })
      .flat()
      .filter(segment => segment.value !== "");
  }
}

export function serializeMessage(message: MessageSegment[]): string {
  let output = "";

  for (let segment of message) {
    switch (segment.type) {
      case MessageSegmentType.BlockLatex:
        output += `\\[${segment.value}\\]`;
        break;
      case MessageSegmentType.InlineLatex:
        output += `\\(${segment.value}\\)`;
        break;
      case MessageSegmentType.Bold:
        output += `**${segment.value}**`;
        break;
      case MessageSegmentType.Italic:
        output += `*${segment.value}*`;
        break;
      case MessageSegmentType.Underline:
        output += `__${segment.value}__`;
        break;
      case MessageSegmentType.Strike:
        output += `~~${segment.value}~~`;
        break;
      case MessageSegmentType.Ping:
        output += `<@${segment.value}>`;
        break;
      default:
        output += segment.value;
    }
  }

  return output;
}