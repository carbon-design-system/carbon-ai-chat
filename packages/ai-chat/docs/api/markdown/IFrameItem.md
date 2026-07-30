# IFrameItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html

## Signature

```ts
interface IFrameItem
```

## Members

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#agent_message_type)

### description

`description?: string`

The description of the source URL. This property is unfurled from the source URL at runtime. It is used when
IFrameItemDisplayOption is set to 'panel' for the preview card to open the panel.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#description)

### display

`display?: IFrameItemDisplayOption`

How the iframe should be displayed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#display)

### image_url

`image_url?: string`

The preview image of the source URL. This property is unfurled from the source URL at runtime. It is used when
IFrameItemDisplayOption is set to 'panel' for the preview card to open the panel.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#image_url)

### message_item_options

`message_item_options?: GenericItemMessageOptions`

Options that control additional features available for a message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#message_item_options)

### response_type

`response_type: MessageResponseTypes`

The response type of this message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#response_type)

### source

`source: string`

The source URL to an embeddable page

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#source)

### streaming_metadata

`streaming_metadata?: ItemStreamingMetadata`

Metadata used to identify a generic item within the context of a stream in order to correlate any updates meant
for a specific item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#streaming_metadata)

### title

`title?: string`

The title of the source URL. This property is unfurled from the source URL at runtime. It is used when
IFrameItemDisplayOption is set to 'panel' for the preview card to open the panel.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#title)

### user_defined

`user_defined?: TUserDefinedType`

An optional buckets of additional user defined properties for this item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.IFrameItem.html#user_defined)
