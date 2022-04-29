# API v1 Design Document

All API calls can either be POSTed to `https://example.com/api/{name}` or be sent through WebSocket to `wss://example.com/ws` with the additional `name` parameter.

## Authentication

### `v1/login`: Login with username and password
Input:
```json
{ "username": "", "password": "" }
```

Output:
```json
{ "success": true, "token": "", "uid": "" }
```

### `v1/signup`: Sign up with details
Input:
```json
{ "username": "", "password": "", "display_name": "", "email": "" }
```

Output:
```json
{ "success": true, "token": "", "uid": "" }
```

### `v1/logout`: Logout and invalidate token
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
Input:
```json
{
  "token": "",
  "display_name?": "",
  "email?": "",
  "image?": "",
  "bio?": ""
}
```

Output:
```json
{ "success": true }
```

## Sets

### `v1/sets`: Get all sets for the user
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

### `v1/messages`: Get all messages for a subset
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