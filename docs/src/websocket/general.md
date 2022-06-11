# General WebSocket API

## `v1/subscribe`: Subscribe to a set
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

## `v1/unsubscribe`: Unsubscribe from a set
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

## `v1/ping`: Pings the server
Pings the server to check if the connection is still alive.

Input:
```json
{ }
```

Output:
```
(triggers a pong event)
```