<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ConversationStatus

- Kind: TypeAlias
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.24.0-rc.1/docs/types/Type_reference.ConversationStatus.html

The current phase of conversation work, exposed as `status` on PublicChatState.

- `loading`: history and the welcome are loading.
- `submitted`: a send is waiting for its first associated response.
- `streaming`: a response is active, or its sender is still pending after a response arrives.
  This includes the gap after the response completes and before the sender settles.
- `ready`: no send or response remains active.
- `error`: the conversation is in a failure state.

Failure takes precedence over loading, and loading takes precedence over turn activity.
You can retain error details received through PublicConfig.onError. An error
status does not guarantee an error callback.

## Signature

```ts
type ConversationStatus = "ready" | "loading" | "submitted" | "streaming" | "error"
```

## Related

- [PublicChatState](./PublicChatState.md)
- [PublicConfig.onError](./PublicConfig.md)
