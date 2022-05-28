# Message Encoding Document
Messages are encoded in Equion in a similar way to Discord, but Equion also supports LaTeX expressions. Messages are stored as a string, with the following patterns having special meaning.

## Patterns

| Name | Regex Pattern | Example | Example Parsed |
| --- | --- | --- | --- |
| Block LaTeX | `/\\\[.*\\\]/` | `\[x^2\]` | <img src="https://latex.codecogs.com/png.image?\dpi{180}x^2" style="background-color:white;padding:4px"> |
| Inline LaTeX | `/\\\(.*\\\)/` | `\(x^2\)` | <img src="https://latex.codecogs.com/png.image?\dpi{120}x^2" style="background-color:white;padding:4px"> |
| Bold | `/\*\*.*\*\*/` | `**bold**` | **bold** |
| Italic | `/\*.*\*/` | `*italic*` | *italic* |
| Underline | `/__.*__/` | `__underline__` | __underline__ |
| Strike | `/\~\~.*\~\~/` | `~~strikethrough~~` | ~~strikethrough~~ |
| Ping | `/<@[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}>/` | `<@115bf718-d12d-11ec-9d64-0242ac120002>` | <a href="#">@William Henderson</a> |
| Link | `/https?:\/\/[^\s]+/` | `https://whenderson.dev/blog` | <a href="https://whenderson.dev/blog">https://whenderson.dev/blog</a> |

Note that for pings, the client would type `@William Henderson` which would be automatically converted to the ID when the message is sent.