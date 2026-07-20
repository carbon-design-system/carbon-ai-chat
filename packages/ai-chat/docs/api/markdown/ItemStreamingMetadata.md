# ItemStreamingMetadata

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ItemStreamingMetadata.html

## Signature

```ts
interface ItemStreamingMetadata
```

## Members

### cancellable

`cancellable?: boolean`

When included on a partial_item, indicates if the stream can be cancelled.
If so, a "stop streaming" button will display in the UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ItemStreamingMetadata.html#cancellable)

### id

`id: string`

An identifier for this item within the full message response. This ID is used to correlate a partial or
complete item chunk with other chunks that represent the same item. This ID is only unique for a given message
response.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ItemStreamingMetadata.html#id)

### stream_stopped

`stream_stopped?: boolean`

Indicates if the stream has stopped which will trigger the UI to respond with appropriate a11y states
and messaging.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ItemStreamingMetadata.html#stream_stopped)
