---
title: Adding messages (experimental)
---

## Overview

{@link ChatInstanceMessaging.upsertMessage} inserts or updates a single message identified by a stable `messageID`. One method covers inserting, streaming, correcting, and regenerating a message. The updater you pass receives the message's current value and returns what replaces it.

This is the preferred flow for new code, but experimental — its semantics and the updater signature may still evolve. If you want a settled API, the stable {@link ChatInstanceMessaging.addMessageChunk} flow remains fully supported; see [Adding messages (legacy)](./AddMessageChunk.md).

The examples below call `instance.messaging`, so you need a {@link ChatInstance} first — get one from the `onBeforeRender` prop.

Reach for `upsertMessage` over {@link ChatInstanceMessaging.addMessage} / {@link ChatInstanceMessaging.addMessageChunk} when you want to:

- **Stream from any source** — drive a streaming UI from SSE, WebSocket, polling, or whole-message snapshots. Accumulate state in your app and apply it with one call per update. You skip the chunk-shape contract of {@link ChatInstanceMessaging.addMessageChunk}.
- **Regenerate** — replace a prior response to the same user input with a fresh one.
- **Correct after the fact** — fix a message after it has already been delivered.
- **Update optimistically** — show a placeholder, then mutate it in place once a backend call returns.

The {@link MessageResponse} shape you return is the same one described in [Message format](./MessageFormat.md).

## The updater contract

See {@link ChatInstanceMessaging.upsertMessage} for the exact signature and {@link UpsertMessageUpdater} for the updater type.

The updater receives the {@link MessageResponse} currently stored under `messageID`, or `undefined` when no message with that ID exists yet, and returns the message that replaces it. The updater may be synchronous or return a Promise; the Promise {@link ChatInstanceMessaging.upsertMessage} returns does not resolve until the updater resolves **and** the chat applies the resulting state.

ID rules:

- If the returned message has no `id`, the chat assigns `messageID`.
- A returned message whose `id` differs from `messageID` throws a `TypeError`.
- Returning `null`/`undefined`, or a non-assistant message (a request or a human-agent message), throws a `TypeError`.

## The state argument

The second argument is a {@link MessageState} describing the lifecycle the chat records for this message after it applies the upsert:

- {@link MessageState.STREAMING} — still producing; the UI may render a streaming indicator.
- {@link MessageState.COMPLETE} — finished producing for now; may still be updated later.
- {@link MessageState.ERROR} — failed to produce; the UI surfaces an error treatment. Treat `ERROR` as terminal.

Required on every call; the chat does not preserve state across calls and applies it uniformly to every item in the returned message. There are no locked-terminal states for `STREAMING`/`COMPLETE`: "complete" means "complete as of now," so you can call `upsertMessage(id, MessageState.STREAMING, ...)` on an already-complete message to start re-streaming it (for example, a regenerate-with-streaming flow).

## Per-messageID serialization

Calls targeting the same `messageID` are serialized — each call awaits the previous call for that ID before running. Calls targeting different `messageID`s run independently and in parallel. This lets several messages stream or update concurrently while each individual message stays internally consistent.

## When receive fires

`upsertMessage` fires {@link BusEventType.PRE_RECEIVE} and {@link BusEventType.RECEIVE} exactly when a call transitions the message into `MessageState.COMPLETE` from any other state — including the case where the message did not previously exist. `STREAMING`-to-`STREAMING` and `COMPLETE`-to-`COMPLETE` upserts do **not** fire these events.

This is the same rule the other delivery methods follow:

- {@link ChatInstanceMessaging.addMessage} records `COMPLETE` and fires {@link BusEventType.RECEIVE} (a one-shot complete insert is a transition to complete).
- {@link ChatInstanceMessaging.addMessageChunk} records `STREAMING` for partial/complete-item chunks and `COMPLETE` on the {@link FinalResponseChunk} — the transition-to-complete fires {@link BusEventType.RECEIVE}.

So regenerating a message that is already `COMPLETE` does not fire {@link BusEventType.RECEIVE} (it is not a new turn landing), while inserting a brand-new `COMPLETE` message does.

## User-defined responses

`upsertMessage` reuses the existing {@link BusEventType.USER_DEFINED_RESPONSE} event for `user_defined` items; it fires once per user-defined item per call, for both inserts and updates. The payload's optional `state` field ({@link BusEventUserDefinedResponse}) carries the current {@link MessageState} whenever the chat has a recorded lifecycle for the message — including messages produced through `upsertMessage`, {@link ChatInstanceMessaging.addMessage}, and the final-response transition of {@link ChatInstanceMessaging.addMessageChunk}. The field is additive, so existing consumers ignore it. In React, the same value is available on {@link RenderUserDefinedState} as `state`.

**Component identity is preserved across updates.** Successive `upsertMessage` calls for the same item resolve to the same slot, so:

- **React consumers** — the slot name is the React `key`, so your component **re-renders with new props** rather than re-mounting. Local component state, animations, and side effects survive across updates.
- **Web component consumers** — the slot wrapper persists across calls. If element-level identity matters, return the same `HTMLElement` reference from `renderUserDefinedResponse` and mutate its content imperatively (the established pattern from {@link ChatInstanceMessaging.addMessageChunk}).

Nested `user_defined` items inside {@link MessageResponseTypes.CARD} / {@link MessageResponseTypes.CAROUSEL} / {@link MessageResponseTypes.GRID} containers are supported — `upsertMessage` inherits the recursion logic from the existing event path.

A React renderer can drive an in-widget streaming indicator straight from the lifecycle state:

```tsx
import { MessageState, RenderUserDefinedState } from "@carbon/ai-chat";

function renderUserDefinedResponse(state: RenderUserDefinedState) {
  const { messageItem, state: lifecycleState } = state;

  if (messageItem?.user_defined?.user_defined_type === "my_widget") {
    return (
      <MyWidget
        data={messageItem.user_defined}
        isStreaming={lifecycleState === MessageState.STREAMING}
      />
    );
  }
  return undefined;
}
```

## Code patterns

**Streaming a single message (SSE-style).** One call per delta. The first call creates the message; subsequent calls update it. {@link BusEventType.RECEIVE} fires once, on the final transition to `COMPLETE`. Each call returns a {@link MessageResponse}.

```typescript
const messageID = "msg-1";

for (const piece of await streamFromBackend()) {
  await instance.messaging.upsertMessage(
    messageID,
    MessageState.STREAMING,
    (prev) => ({
      id: messageID,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: (prev?.output.generic?.[0]?.text ?? "") + piece,
            streaming_metadata: { id: "1" },
          },
        ],
      },
    }),
  );
}

// Final call transitions STREAMING -> COMPLETE; fires receive.
// prev is the message built by the loop above; return it unchanged to finalize.
await instance.messaging.upsertMessage(
  messageID,
  MessageState.COMPLETE,
  (prev) => prev ?? { id: messageID, output: { generic: [] } },
);
```

**Regenerate (one-shot, non-streaming).** Fires {@link BusEventType.RECEIVE} if `prev` did not exist or was not `COMPLETE`; does not fire if `prev` was already `COMPLETE`. `request_id` is a field of {@link MessageResponse} that links the response to the user input it answers.

```typescript
const userInputID = "req-42";
const responseID = findResponseByRequestId(userInputID); // app-level lookup

await instance.messaging.upsertMessage(
  responseID,
  MessageState.COMPLETE,
  async () => {
    const fresh = await fetchFreshResponse(userInputID);
    return { ...fresh, id: responseID, request_id: userInputID };
  },
);
```

**Optimistic update.** Show a placeholder immediately, then replace it once the backend returns.

```typescript
await instance.messaging.upsertMessage(
  messageID,
  MessageState.STREAMING,
  () => ({
    id: messageID,
    output: {
      generic: [
        { response_type: MessageResponseTypes.TEXT, text: "Working on it..." },
      ],
    },
  }),
);

const result = await backendCall();

await instance.messaging.upsertMessage(
  messageID,
  MessageState.COMPLETE,
  () => ({
    id: messageID,
    output: { generic: [result] },
  }),
);
```

## Cancellation

Cancellation works the same way regardless of which delivery method you use. When the abort signal fires, stop your stream and call `upsertMessage` with `MessageState.COMPLETE` to transition the message out of streaming and hide the "stop streaming" button. See [Cancelling request (stop streaming)](./CustomServer.md#cancelling-request-stop-streaming) for the full pattern and an `upsertMessage` finalization example.

## Related

- [Adding messages (legacy)](./AddMessageChunk.md) — the stable chunk-based streaming flow.
- [Server communication](./CustomServer.md) — wiring up {@link PublicConfigMessaging.customSendMessage} and cancellation.
- React example: [examples/react/upsert-message-user-defined](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/upsert-message-user-defined) — a stateful steps-card widget updated in place over time.
- Web component example: [examples/web-components/upsert-message-user-defined](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/upsert-message-user-defined) — the same flow with `cds-aichat-custom-element`.
