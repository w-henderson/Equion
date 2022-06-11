# Authentication API

## `v1/login`: Login with username and password
Asserts that the username and password combination are valid, then returns a token that can be used to authenticate future requests. The token does not expire, but can be invalidated with `v1/logout`.

Input:
```json
{ "username": "", "password": "" }
```

Output:
```json
{ "success": true, "token": "", "uid": "" }
```

## `v1/signup`: Sign up with details
Signs up a user with the given details. Further customisation should be done through the `v1/updateUser` endpoint. The user will be automatically logged in, so a token will be returned, along with the new user's ID. If the user name already exists, an error will occur.

Input:
```json
{ "username": "", "password": "", "displayName": "", "email": "" }
```

Output:
```json
{ "success": true, "token": "", "uid": "" }
```

## `v1/logout`: Logout and invalidate token
Logs out the user and invalidates the token.

Input:
```json
{ "token": "" }
```

Output:
```json
{ "success": true }
```

## `v1/validateToken`: Validate token
Asserts that the token is valid, and if so, returns the user's ID. Used for restoring sessions.

Input:
```json
{ "token": "" }
```

Output:
```json
{
  "success": true,
  "uid": ""
}
```