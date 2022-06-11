# Events

These are sent to the client when events happen in a set.

## `v1/subset`: Subset event
Sent when a subset is created, modified or deleted.

```json
{
  "event": "v1/subset",
  "set": "",
  "subset": {
    "id": "",
    "name": "",
  },
  "deleted": false
}
```

## `v1/message`: Message event
Sent when a message is sent, modified or deleted.

```json
{
  "event": "v1/message",
  "set": "",
  "subset": "",
  "message": {
    "id": "",
    "content": "",
    "authorId": "",
    "authorName": "",
    "authorImage?": "",
    "attachment?": {
      "id": "",
      "name": "",
      "type": "",
    },
    "sendTime": "",
  },
  "deleted": false
}
```

## `v1/user`: User event
Sent when a user joins a set, updates their details, or leaves a set.

```json
{
  "event": "v1/user",
  "set": "",
  "user": {
    "uid": "",
    "username": "",
    "displayName": "",
    "email": "",
    "image?": "",
    "bio?": "",
    "online": true
  },
  "deleted": false
}
```

## `v1/voice`: Voice event
Sent when a user joins or leaves a voice channel.

```json
{
  "event": "v1/voice",
  "set": "",
  "user": {
    "peerId": "",
    "user": {
      "uid": "",
      "username": "",
      "displayName": "",
      "email": "",
      "image?": "",
      "bio?": ""
    }
  },
  "deleted": false
}
```

## `v1/typing`: User recently typed
Sent when a user types in the message box.

```json
{
  "event": "v1/typing",
  "subset": "",
  "uid": ""
}
```

## `v1/pong`: Pong
Sent when a ping is received.

```json
{
  "event": "v1/pong"
}
```