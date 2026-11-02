<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ItemStreamingMetadata

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ItemStreamingMetadata.html

## Signature

```ts
interface ItemStreamingMetadata
```

## Members

### cancellable

`cancellable?: boolean`

Controls the stop streaming button during a streamed response. `true` shows and
enables it. `false` disables an already visible button without hiding it, including
a button shown by PublicConfigMessaging.showStopButtonImmediately.
A later `true` enables it again unless the user has already clicked stop.

For ChatInstanceMessaging.upsertMessage, any explicit `false` in the
snapshot takes precedence over `true`. For ChatInstanceMessaging.addMessageChunk,
the latest explicit value on a partial item applies. Omitting the flag leaves the
response's setting unchanged in either flow. If several responses stream at once,
any response marked `false` keeps the shared button disabled until it permits
cancellation or ends. Ending the last stream clears the button state.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ItemStreamingMetadata.html#cancellable)

### id

`id: string`

An identifier for this item within the full message response. This ID is used to correlate a partial or
complete item chunk with other chunks that represent the same item. This ID is only unique for a given message
response.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ItemStreamingMetadata.html#id)

### stream_stopped

`stream_stopped?: boolean`

Indicates if the stream has stopped which will trigger the UI to respond with appropriate a11y states
and messaging.

[Reference](https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/interfaces/Type_reference.ItemStreamingMetadata.html#stream_stopped)
