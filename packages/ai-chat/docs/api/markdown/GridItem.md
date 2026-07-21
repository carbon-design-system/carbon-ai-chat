# GridItem

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html

## Signature

```ts
interface GridItem
```

## Members

### agent_message_type

`agent_message_type?: HumanAgentMessageType`

For messages that are sent between the user and a human agent, we assign an agent type to the message to distinguish what type it is.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#agent_message_type)

### columns

`columns: { width: string }[]`

The list of column specifications. This will determine the maximum number of columns that can be rendered.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#columns)

### horizontal_alignment

`horizontal_alignment?: HorizontalCellAlignment`

Determines the horizontal alignment of all items in the grid.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#horizontal_alignment)

### max_width

`max_width?: WidthOptions`

Sets an optional max width of the component. Options are small, medium and large.
By default, the component will be 100% width of the container.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#max_width)

### message_item_options

`message_item_options?: GenericItemMessageOptions`

Options that control additional features available for a message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#message_item_options)

### response_type

`response_type: MessageResponseTypes`

The response type of this message item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#response_type)

### rows

`rows: { cells: { horizontal_alignment?: HorizontalCellAlignment; items: GenericItem<Record<string, unknown>>[]; vertical_alignment?: VerticalCellAlignment }[] }[]`

A list of rows to render.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#rows)

### streaming_metadata

`streaming_metadata?: ItemStreamingMetadata`

Metadata used to identify a generic item within the context of a stream in order to correlate any updates meant
for a specific item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#streaming_metadata)

### user_defined

`user_defined?: TUserDefinedType`

An optional buckets of additional user defined properties for this item.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#user_defined)

### vertical_alignment

`vertical_alignment?: VerticalCellAlignment`

Determines the vertical alignment of all items in the grid.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.GridItem.html#vertical_alignment)
