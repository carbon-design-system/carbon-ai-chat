# FinalResponseChunk

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FinalResponseChunk.html

Finalizes the full response and ends streaming.

This provides the authoritative final state of the full message response. It should
include all items that were streamed (and any corrections). For any item that was
streamed, include ItemStreamingMetadata.id to preserve identity and avoid
remounts. The message ID should match streaming_metadata.response_id.

## Signature

```ts
interface FinalResponseChunk
```

## Members

### final_response

`final_response: MessageResponse`

The final message response. If this response contains items that were streamed,
those items should include ItemStreamingMetadata.id to avoid remounts.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.FinalResponseChunk.html#final_response)

## Related

- [ItemStreamingMetadata.id](./ItemStreamingMetadata.md)
