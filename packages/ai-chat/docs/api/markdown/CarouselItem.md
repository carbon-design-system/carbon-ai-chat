# CarouselItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CarouselItem.html

## Signature

```ts
interface CarouselItem
```

## Members

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CarouselItem.html#agent_message_type)

### items

`items: GenericItem<Record<string, unknown>>[]`

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CarouselItem.html#items)

### message_item_options

`message_item_options?: GenericItemMessageOptions`

Options that control additional features available for a message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CarouselItem.html#message_item_options)

### response_type

`response_type: MessageResponseTypes`

The response type of this message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CarouselItem.html#response_type)

### streaming_metadata

`streaming_metadata?: ItemStreamingMetadata`

Metadata used to identify a generic item within the context of a stream in order to correlate any updates meant
for a specific item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CarouselItem.html#streaming_metadata)

### user_defined

`user_defined?: TUserDefinedType`

An optional buckets of additional user defined properties for this item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CarouselItem.html#user_defined)
