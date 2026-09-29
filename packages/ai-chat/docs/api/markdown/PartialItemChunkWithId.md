<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# PartialItemChunkWithId

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/types/Type_reference.PartialItemChunkWithId.html

A stricter partial item chunk type for streaming implementations that want compile-time enforcement of
ItemStreamingMetadata.id. This is optional and not required for compatibility.

## Signature

```ts
type PartialItemChunkWithId = Omit<PartialItemChunk, "partial_item"> & { partial_item: DeepPartial<GenericItem> & { streaming_metadata: ItemStreamingMetadata } }
```

## Related

- [ItemStreamingMetadata.id](./ItemStreamingMetadata.md)
