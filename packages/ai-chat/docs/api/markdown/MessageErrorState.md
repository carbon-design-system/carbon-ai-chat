# MessageErrorState

- Kind: Enum
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageErrorState.html

The different type of error states a given message can be in.

## Signature

```ts
enum MessageErrorState
```

## Members

### FAILED

`FAILED = 2`

The message failed to be sent and no more attempts will be made.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageErrorState.html#failed)

### FAILED_WHILE_STREAMING

`FAILED_WHILE_STREAMING = 3`

The message failed while streaming.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageErrorState.html#failed_while_streaming)

### NONE

`NONE = 1`

No errors.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageErrorState.html#none)

### RETRYING

`RETRYING = 4`

There was an error sending the message but the system is retrying the message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageErrorState.html#retrying)

### WAITING

`WAITING = 5`

Indicates that the previous message has entered the retrying state and that this message is waiting for it to
finish or fail. This message will remain in the waiting state until it finishes successfully or it enters a
retrying state itself.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageErrorState.html#waiting)
