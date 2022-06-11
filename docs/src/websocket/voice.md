# Voice API

## `v1/connectUserVoice`: Register user voice connection
Registers a user's voice connection allowing them to use voice chat features.

Input:
```json
{
  "token": "",
  "peerId": ""
}
```

Output:
```json
{ "success": true }
```

## `v1/disconnectUserVoice`: Unregister user voice connection
Unregisters a user's voice connection.

Input:
```json
{ "token": "" }
```

Output:
```json
{ "success": true }
```

## `v1/connectToVoiceChannel`: Connect to voice channel
Connects the user to the given voice channel.

Input:
```json
{
  "token": "",
  "channel": "",
}
```

Output:
```json
{ "success": true }
```

## `v1/leaveVoiceChannel`: Leave current voice channel
Leaves the user's current voice channel.

Input:
```json
{ "token": "" }
```

Output:
```json
{ "success": true }
```