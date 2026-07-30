# CompleteItemChunk

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CompleteItemChunk.html

Completes a single streamed item before the full response is ready.

Use this to replace a streamed item with its final, corrected version while other
items are still streaming. The complete item should include all data needed to
render the item (including anything from partial chunks). Include
ItemStreamingMetadata.id to correlate with prior partial chunks and preserve
identity. If you are only streaming a single item, you can skip this and send a
FinalResponseChunk instead.

## Signature

```ts
interface CompleteItemChunk
```

## Members

### complete_item

`complete_item: GenericItem`

A complete message item. If this item was streamed via partial chunks,
you should include ItemStreamingMetadata.id so the UI can preserve identity.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CompleteItemChunk.html#complete_item)

### partial_response

`partial_response?: PartialResponse`

Change the agent display name and other items on the full response.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CompleteItemChunk.html#partial_response)

### streaming_metadata

`streaming_metadata?: { response_id: string }`

Additional metadata associated with the stream.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CompleteItemChunk.html#streaming_metadata)

## Related

- [FinalResponseChunk](./FinalResponseChunk.md)
- [ItemStreamingMetadata.id](./ItemStreamingMetadata.md)
