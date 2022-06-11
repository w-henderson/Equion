# User API

## `v1/user`: Get user details
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
    "displayName": "",
    "email": "",
    "image?": "",
    "bio?": "",
    "online": true
  }
}
```

## `v1/updateUser`: Update user details
Updates the current user's details. This endpoint requires authentication to identify and authenticate the user. All fields apart from `token` are optional, and only the fields specified will be updated.

Input:
```json
{
  "token": "",
  "displayName?": "",
  "email?": "",
  "bio?": ""
}
```

Output:
```json
{ "success": true }
```