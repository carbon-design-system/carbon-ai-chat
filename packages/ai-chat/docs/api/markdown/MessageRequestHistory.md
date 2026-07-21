# MessageRequestHistory

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequestHistory.html

This interface contains information about the history of a given MessageRequest. This information should be
saved your history store.

## Signature

```ts
interface MessageRequestHistory
```

## Members

### error_state

`error_state?: MessageErrorState`

The error state of this message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequestHistory.html#error_state)

### is_welcome_request

`is_welcome_request?: boolean`

If the message was a welcome node request.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequestHistory.html#is_welcome_request)

### label

`label?: string`

The user-friendly label that was associated with this message. This is used on messages that were sent by the
user to the assistant to request a response. This is the user displayed text that was entered or selected by
the user when that request was made. Most commonly used to make sure a OptionItem shows the correct button
selected when loading history.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequestHistory.html#label)

### related_message_id

`related_message_id?: string`

If this message is related to another message, this is the ID of that other message. This is used when a user
choices an option and it includes the ID of the message response that presented the options to the user so we
can associate the user's request with that earlier response and display the appropriate selected state.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequestHistory.html#related_message_id)

### silent

`silent?: boolean`

Indicates if this is a "silent" message. These messages are sent to or received from the assistant but should
not be displayed to the user.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequestHistory.html#silent)

### timestamp

`timestamp?: number`

The time at which this message occurred.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageRequestHistory.html#timestamp)

## Related

- [MessageRequest](./MessageRequest.md)
