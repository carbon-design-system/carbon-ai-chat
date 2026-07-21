# PauseItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PauseItem.html

A pause item returned in a message response from an assistant. This indicates that the client should pause before
displaying additional response items.

## Signature

```ts
interface PauseItem
```

## Members

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PauseItem.html#agent_message_type)

### message_item_options

`message_item_options?: GenericItemMessageOptions`

Options that control additional features available for a message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PauseItem.html#message_item_options)

### response_type

`response_type: MessageResponseTypes`

The response type of this message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PauseItem.html#response_type)

### streaming_metadata

`streaming_metadata?: ItemStreamingMetadata`

Metadata used to identify a generic item within the context of a stream in order to correlate any updates meant
for a specific item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PauseItem.html#streaming_metadata)

### time

`time?: number`

How long to pause, in milliseconds.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PauseItem.html#time)

### typing

`typing?: boolean`

Whether to display an "is typing" indicator during the pause.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PauseItem.html#typing)

### user_defined

`user_defined?: TUserDefinedType`

An optional buckets of additional user defined properties for this item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PauseItem.html#user_defined)
