# UpsertMessageUpdater

**Experimental.**

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.UpsertMessageUpdater.html

The updater function passed to ChatInstanceMessaging.upsertMessage. Receives the
message currently stored under the target ID (or `undefined` when no message with that
ID is in the store) and returns the MessageResponse that should replace it. May
be synchronous or asynchronous.

## Signature

```ts
type UpsertMessageUpdater = (previous: MessageResponse | undefined) => Promise<MessageResponse> | MessageResponse
```

## Related

- [ChatInstanceMessaging.upsertMessage](./ChatInstanceMessaging.md)
- [MessageResponse](./MessageResponse.md)
