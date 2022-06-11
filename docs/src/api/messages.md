# Messages API

## `v1/messages`: Get messages for a subset
Gets messages from the given subset. If set, the `before` field takes a message ID, and will only return messages sent before that message. If set, the `limit` field will limit the number of messages returned.

Input:
```json
{
  "token": "",
  "subset": "",
  "before?": "",
  "limit?": ""
}
```

Output:
```json
{
  "success": true,
  "messages": [
    {
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
    }
  ]
}
```

## `v1/sendMessage`: Send a message to a subset
Sends a message from the given user to the given subset.

Input:
```json
{
  "token": "",
  "subset": "",
  "message": "",
  "attachment?": {
    "name": "",
    "data": "<base64>"
  }
}
```

Output:
```json
{ "success": true }
```

## `v1/updateMessage`: Update or delete message
Updates the content of the given message or deletes it. Requires the user to be the author of the message.

Input:
```json
{
  "token": "",
  "message": "",
  "content?": "",
  "delete?": false
}
```

Output:
```json
{ "success": true }
```

## `v1/typing`: Send typing notification
Informs members of the given set that the user has recently typed in the message box.

Input:
```json
{
  "token": "",
  "subset": ""
}
```

Output:
```json
{ "success": true }
```