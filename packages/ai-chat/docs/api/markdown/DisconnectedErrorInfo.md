# DisconnectedErrorInfo

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DisconnectedErrorInfo.html

This is used to indicate the state of errors that can happen any time during a chat where the service desk
implementation has lost a connection to the back-end. If this error occurs while the user is waiting for an
agent to join, it will be treated as a ErrorType.CONNECTING error instead.

## Signature

```ts
interface DisconnectedErrorInfo
```

## Members

### isDisconnected

`isDisconnected: boolean`

Indicates if the service desk has become disconnected. A value of true can be passed that will indicate that a
previous disconnection is over and the service desk is now connected again.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DisconnectedErrorInfo.html#isdisconnected)

### logInfo

`logInfo?: unknown`

An optional value that will be logged to the console as an error.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DisconnectedErrorInfo.html#loginfo)

### type

`type: DISCONNECTED`

The discriminating value for this type.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.DisconnectedErrorInfo.html#type)

## Related

- [ErrorType.CONNECTING](./ErrorType.md)
