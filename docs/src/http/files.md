# Files API

## `v1/files/{id}`: Get file
Gets the file with the given ID. This endpoint does not require authentication.

## `v1/updateUserImage`: Update user image
Updates the current user's image. This endpoint requires authentication to identify and authenticate the user.

Input:
- Binary file
- `X-File-Name` header with the file name
- `X-Equion-Token` header with the user's token