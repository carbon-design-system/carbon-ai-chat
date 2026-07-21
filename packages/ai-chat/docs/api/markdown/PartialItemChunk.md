# PartialItemChunk

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PartialItemChunk.html

The interface for a chunk that represents a partial update (or first time chunk) to a message item.

## Signature

```ts
interface PartialItemChunk
```

## Members

### partial_item

`partial_item: DeepPartial<GenericItem<Record<string, unknown>>>`

The partial details of the item. The client will decide what rules to follow for merging this in with any
existing data for the same item (which is identified using the ItemStreamingMetadata.id property).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PartialItemChunk.html#partial_item)

### partial_response

`partial_response?: PartialResponse`

Change the agent display name and other items on the full response.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PartialItemChunk.html#partial_response)

### streaming_metadata

`streaming_metadata?: { response_id: string }`

Additional metadata associated with the stream.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.PartialItemChunk.html#streaming_metadata)
