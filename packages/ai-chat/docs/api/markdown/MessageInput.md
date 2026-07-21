# MessageInput

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageInput.html

The default interface for message input that is sent to an assistant in a message request. This represents basic text
input.

## Signature

```ts
interface MessageInput
```

## Members

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageInput.html#agent_message_type)

### message_type

`message_type?: MessageInputType`

The type of user input.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageInput.html#message_type)

### structured_data

`structured_data?: StructuredData`

**Experimental.**

Structured data that can be sent alongside or instead of plain text input.
Supports typed fields (text, select, multi-select, file, etc.) and an
escape hatch for arbitrary user-defined data.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageInput.html#structured_data)

### text

`text?: string`

The text of the user input to send to the back-end.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageInput.html#text)
