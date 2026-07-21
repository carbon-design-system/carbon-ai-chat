# MessageResponseHistory

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponseHistory.html

This interface contains information about the history of a given MessageResponse. This information should be
saved your history store.

## Signature

```ts
interface MessageResponseHistory
```

## Members

### error_state

`error_state?: MessageErrorState`

The error state of this message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponseHistory.html#error_state)

### feedback

`feedback?: { [feedbackID: string]: MessageHistoryFeedback }`

The state of feedback provided on the items in this message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponseHistory.html#feedback)

### silent

`silent?: boolean`

Indicates if this is a "silent" message. These messages are sent to or received from the assistant but should
not be displayed to the user.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponseHistory.html#silent)

### timestamp

`timestamp?: number`

The time at which this message occurred.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponseHistory.html#timestamp)

## Related

- [MessageResponse](./MessageResponse.md)
