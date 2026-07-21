# SystemMessageItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SystemMessageItem.html

A system message item that can be returned in a message response. System messages are used for
status updates, progress indicators, or informational notices.

If a response contains ONLY system messages, they render standalone (centered, no avatar, no bubble).
If mixed with other response types, system messages render inline within the message bubble.

## Signature

```ts
interface SystemMessageItem
```

## Members

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SystemMessageItem.html#agent_message_type)

### message_item_options

`message_item_options?: GenericItemMessageOptions`

Options that control additional features available for a message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SystemMessageItem.html#message_item_options)

### response_type

`response_type: SYSTEM`

The response type is always "system" for system messages.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SystemMessageItem.html#response_type)

### streaming_metadata

`streaming_metadata?: ItemStreamingMetadata`

Metadata used to identify a generic item within the context of a stream in order to correlate any updates meant
for a specific item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SystemMessageItem.html#streaming_metadata)

### title

`title: string`

The title text to display in the system message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SystemMessageItem.html#title)

### user_defined

`user_defined?: TUserDefinedType`

An optional buckets of additional user defined properties for this item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SystemMessageItem.html#user_defined)

### variant

`variant?: SystemMessageVariant`

How the system line is presented when the message renders as a **standalone** system line
(response contains only system items): default helper text, date separator with rules, or
agent with a rule above and helper text. When system items render **inline** inside a
bubble, `variant` is ignored and the default inline style is used.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.SystemMessageItem.html#variant)
