# MessageState

**Experimental.**

- Kind: Enum
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageState.html

Lifecycle state passed to ChatInstanceMessaging.upsertMessage to describe the
message's state after the upsert completes. Carbon AI Chat tracks this state internally;
it is never written onto a MessageResponse.

`addMessage`, `addMessageChunk`, and `upsertMessage` may all target the same message
id without producing duplicate `pre:receive` / `receive` events — Carbon AI Chat tracks
the recorded state per id and fires those events only on the first transition to
COMPLETE.

## Signature

```ts
enum MessageState
```

## Members

### COMPLETE

`COMPLETE = "complete"`

**Experimental.**

The message has reached its final shape. Carbon AI Chat fires
BusEventType.PRE_RECEIVE and BusEventType.RECEIVE when a message
transitions into this state from any other state, including the case where no
message with this ID previously existed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageState.html#complete)

### ERROR

`ERROR = "error"`

**Experimental.**

The message terminated in an error condition. The chat displays the message as-is
and does not fire BusEventType.PRE_RECEIVE or BusEventType.RECEIVE
when a message transitions into this state. Treat `ERROR` as terminal — subsequent
upserts targeting the same id are still accepted but should be rare.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageState.html#error)

### STREAMING

`STREAMING = "streaming"`

**Experimental.**

The message is still being constructed and further updates are expected. The
"stop streaming" affordance remains available while a message is in this state if
any item carries `streaming_metadata.cancellable: true`.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.MessageState.html#streaming)

## Related

- [ChatInstanceMessaging.upsertMessage](./ChatInstanceMessaging.md)
- [MessageResponse](./MessageResponse.md)
- [MessageState.COMPLETE](./MessageState.md)
