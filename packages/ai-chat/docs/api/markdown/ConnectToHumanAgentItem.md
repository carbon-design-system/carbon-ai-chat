# ConnectToHumanAgentItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html

A "connect to agent" item returned in a message response from an assistant. This is used when the back-end
indicates that a user's conversation should be escalated to a human agent.

## Signature

```ts
interface ConnectToHumanAgentItem
```

## Members

### agent_available

`agent_available?: { message: string }`

Contains the message to be rendered if there are agents available.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html#agent_available)

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html#agent_message_type)

### agent_unavailable

`agent_unavailable?: { message: string }`

Contains the message to be rendered if there are no agents available.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html#agent_unavailable)

### message_item_options

`message_item_options?: GenericItemMessageOptions`

Options that control additional features available for a message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html#message_item_options)

### message_to_human_agent

`message_to_human_agent?: string`

A message to be sent to the human agent who will be taking over the conversation.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html#message_to_human_agent)

### response_type

`response_type: MessageResponseTypes`

The response type of this message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html#response_type)

### streaming_metadata

`streaming_metadata?: ItemStreamingMetadata`

Metadata used to identify a generic item within the context of a stream in order to correlate any updates meant
for a specific item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html#streaming_metadata)

### transfer_info

`transfer_info?: ConnectToHumanAgentItemTransferInfo`

When a conversation is escalated to an agent additional information is needed to fulfill the request. This
additional information typically is added by the channel integration and cannot be deduced from the dialog
itself.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html#transfer_info)

### user_defined

`user_defined?: TUserDefinedType`

An optional buckets of additional user defined properties for this item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ConnectToHumanAgentItem.html#user_defined)
