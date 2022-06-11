# Sets and Subsets API

## `v1/sets`: Get all sets for the user
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
      ],
      "members": [
        {
          "uid": "",
          "username": "",
          "displayName": "",
          "email": "",
          "image?": "",
          "bio?": "",
          "online": true
        }
      ],
      "voiceMembers": [
        {
          "peerId": "",
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
      ]
    }
  ]
}
```

## `v1/set`: Get set details
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
    ],
    "members": [
      {
        "uid": "",
        "username": "",
        "displayName": "",
        "email": "",
        "image?": "",
        "bio?": "",
        "online": true
      }
    ],
    "voiceMembers": [
      {
        "peerId": "",
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
    ]
  }
}
```

## `v1/createSet`: Create a new set
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

## `v1/createSubset`: Create a new subset
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

## `v1/joinSet`: Join a set
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

## `v1/leaveSet`: Leave a set
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

## `v1/updateSubset`: Update or delete subset
Updates the details of the given subset or deletes it. Requires admin privileges over the set.

Input:
```json
{
  "token": "",
  "subset": "",
  "name?": "",
  "delete?": false
}
```

Output:
```json
{ "success": true }
```