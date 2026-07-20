# UserMessageErrorInfo

- Kind: Interface
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UserMessageErrorInfo.html

This error is used to report when there was an error sending a message to the agent.

## Signature

```ts
interface UserMessageErrorInfo
```

## Members

### logInfo

`logInfo?: unknown`

An optional value that will be logged to the console as an error.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UserMessageErrorInfo.html#loginfo)

### messageID

`messageID: string`

The ID of the message that is in error.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UserMessageErrorInfo.html#messageid)

### type

`type: USER_MESSAGE`

The discriminating value for this type.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.UserMessageErrorInfo.html#type)
