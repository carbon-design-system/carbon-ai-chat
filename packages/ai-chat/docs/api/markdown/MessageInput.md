# MessageInput

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MessageInput.html

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

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MessageInput.html#agent_message_type)

### display_content

`display_content?: JSONContent`

**Experimental.**

TipTap JSONContent captured when the user sent the message. When present,
the user message bubble renders structurally; mention / command / custom
nodes render via their respective renderers. Absent on plain-text /
legacy messages — the bubble falls back to `text`.

Snapshot semantics: this reflects what the user typed at send time. If a
`pre:send` handler rewrites `input.text`, `display_content` does NOT
auto-update.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MessageInput.html#display_content)

### message_type

`message_type?: MessageInputType`

The type of user input.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MessageInput.html#message_type)

### structured_data

`structured_data?: StructuredData`

**Experimental.**

Structured data that can be sent alongside or instead of plain text input.
Carries an array of structured fields and an escape hatch for arbitrary
user-defined data.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MessageInput.html#structured_data)

### text

`text?: string`

The text of the user input to send to the back-end.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MessageInput.html#text)
