# API v1 Design Document

All API calls can either be POSTed to `https://example.com/api/{command}` or be sent through WebSocket to `wss://example.com/ws` with the additional `command` parameter.

**Warning:** This is a work in progress, and all API calls are subject to change.

## Authentication

### `v1/login`: Login with username and password
Asserts that the username and password combination are valid, then returns a token that can be used to authenticate future requests. The token does not expire, but can be invalidated with `v1/logout`.

Input:
```json
{ "username": "", "password": "" }
```

Output:
```json
{ "success": true, "token": "", "uid": "" }
```

### `v1/signup`: Sign up with details
Signs up a user with the given details. Further customisation should be done through the `v1/updateUser` endpoint. The user will be automatically logged in, so a token will be returned, along with the new user's ID. If the user name already exists, an error will occur.

Input:
```json
{ "username": "", "password": "", "display_name": "", "email": "" }
```

Output:
```json
{ "success": true, "token": "", "uid": "" }
```

### `v1/logout`: Logout and invalidate token
Logs out the user and invalidates the token.

Input:
```json
{ "token": "" }
```

Output:
```json
{ "success": true }
```

## User

### `v1/user`: Get user details
Gets details for the user with the given ID. This endpoint does not require authentication. The user's email is currently returned, but this is likely to change in the future.

Input:
```json
{ "uid": "" }
```

Output:
```json
{
  "success": true,
  "user": {
    "uid": "",
    "username": "",
    "display_name": "",
    "email": "",
    "image?": "",
    "bio?": ""
  }
}
```

### `v1/updateUser`: Update user details
Updates the current user's details. This endpoint requires authentication to identify and authenticate the user. All fields apart from `token` are optional, and only the fields specified will be updated.

Input:
```json
{
  "token": "",
  "display_name?": "",
  "email?": "",
  "bio?": ""
}
```

Output:
```json
{ "success": true }
```

## Files (HTTP only)

### `v1/files/{id}`: Get file
Gets the file with the given ID. This endpoint does not require authentication.

### `v1/updateUserImage`: Update user image
Updates the current user's image. This endpoint requires authentication to identify and authenticate the user.

Input:
- Binary file
- `X-File-Name` header with the file name
- `X-Equion-Token` header with the user's token

## Sets

### `v1/sets`: Get all sets for the user
Returns all of the current user's sets, in no particular order.

Input:
```json
{ "token": "" }
```

Output:
```json
{
  "success": true,
  "sets": [
    {
      "id": "",
      "name": "",
      "icon": "",
      "admin": false,
      "subsets": [
        {
          "id": "",
          "name": "",
        }
      ]
    }
  ]
}
```

### `v1/set`: Get set details
Gets details for a specific set. This endpoint requires authentication, and will return an error if the user is not a member of the set.

Input:
```json
{ "token": "", "id": "" }
```

Output:
```json
{
  "success": true,
  "set": {
    "id": "",
    "name": "",
    "icon": "",
    "admin": false,
    "subsets": [
      {
        "id": "",
        "name": "",
      }
    ]
  }
}
```

### `v1/createSet`: Create a new set
Creates a new set with the given name, and icon if supplied. Returns the ID of the new set. The authenticated user will automatically become a member of the set, and will also be given administrative privileges over the set.

Input:
```json
{
  "token": "",
  "name": "",
  "icon?": "",
}
```

Output:
```json
{ "success": true, "id": "" }
```

### `v1/createSubset`: Create a new subset
Creates a new subset of the given set with the given name. Returns the ID of the new subset.

Input:
```json
{
  "token": "",
  "set": "",
  "name": "",
}
```

Output:
```json
{ "success": true, "id": "" }
```

### `v1/joinSet`: Join a set
Joins the authenticated user to the given set.

Input:
```json
{
  "token": "",
  "set": "",
}
```

Output:
```json
{ "success": true }
```

### `v1/leaveSet`: Leave a set
Removes the authenticated user from the given set.

Input:
```json
{
  "token": "",
  "set": "",
}
```

Output:
```json
{ "success": true }
```

## Messages

### `v1/messages`: Get messages for a subset
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
      "author_id": "",
      "author_name": "",
      "author_image?": "",
      "send_time": "",
    }
  ]
}
```

### `v1/sendMessage`: Send a message to a subset
Sends a message from the given user to the given subset.

Input:
```json
{
  "token": "",
  "subset": "",
  "message": ""
}
```

Output:
```json
{ "success": true }
```

## WebSocket-only Commands

### `v1/subscribe`: Subscribe to a set
Subscribes the WebSocket connection to updates for the given set.

Input:
```json
{
  "token": "",
  "set": ""
}
```

Output:
```json
{ "success": true }
```

### `v1/unsubscribe`: Unsubscribe from a set
Unsubscribes the WebSocket connection from updates for the given set.

Input:
```json
{
  "token": "",
  "set": ""
}
```

Output:
```json
{ "success": true }
```

## WebSocket-only Events
These are sent to the client when events happen in a set.

### `v1/newSubset`: New subset
Sent when a new subset is created.

```json
{
  "event": "v1/newSubset",
  "set": "",
  "subset": {
    "id": "",
    "name": "",
  }
}
```

### `v1/newMessage`: New message in a subset
Sent when a new message is sent to a subset.

```json
{
  "event": "v1/newMessage",
  "set": "",
  "subset": "",
  "message": {
    "id": "",
    "content": "",
    "author_id": "",
    "author_name": "",
    "author_image?": "",
    "send_time": "",
  }
}