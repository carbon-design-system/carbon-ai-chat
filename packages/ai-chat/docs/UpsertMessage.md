---
title: Adding messages (experimental)
---

## Overview

{@link ChatInstanceMessaging.upsertMessage | upsertMessage} inserts or updates one message by a stable `messageID`. One method covers inserting, streaming, correcting, and regenerating — you pass an updater that receives the current message and returns what replaces it.

Prefer this flow for new code, but note it's experimental. Its behavior and the updater signature may still change. For a settled API, the stable {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk} flow is still fully supported. See [Adding messages (legacy)](./AddMessageChunk.md).

The examples below call `instance.messaging`, so get a {@link ChatInstance | ChatInstance} from the `onBeforeRender` prop first.

Reach for `upsertMessage` over {@link ChatInstanceMessaging.addMessage | addMessage} or {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk} when you want to:

- **Stream from any source** — drive a streaming UI from SSE, WebSocket, polling, or whole-message snapshots. Build up the state in your app. Apply it with one call per update. You skip the chunk-shape contract of {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk}.
- **Regenerate** — replace an earlier response to the same user input with a fresh one.
- **Correct after the fact** — fix a message after the chat delivers it.
- **Update optimistically** — show a placeholder, then change it in place once a backend call returns.

You return a {@link MessageResponse | MessageResponse} shape. [Message format](./MessageFormat.md) describes it.

## The updater contract

See {@link ChatInstanceMessaging.upsertMessage | upsertMessage} for the full signature. See {@link UpsertMessageUpdater | the updater type} for its shape.

The updater gets the {@link MessageResponse | MessageResponse} now stored under `messageID`. It gets `undefined` when no message with that ID exists yet. It returns the message that replaces the stored one. The updater can be synchronous or return a Promise. {@link ChatInstanceMessaging.upsertMessage | upsertMessage} also returns a Promise. That Promise waits until the updater resolves **and** the chat applies the new state.

ID rules:

- If the returned message has no `id`, the chat assigns `messageID`.
- A returned message whose `id` differs from `messageID` throws a `TypeError`.
- Returning `null` or `undefined` throws a `TypeError`. So does returning a non-assistant message — a request or a human-agent message.

## The state argument

The second argument is a {@link MessageState | MessageState}. It sets the lifecycle the chat records for this message after the upsert applies:

- {@link MessageState.STREAMING | STREAMING} — still producing. The UI may show a streaming indicator.
- {@link MessageState.COMPLETE | COMPLETE} — done producing for now. You can still update it later.
- {@link MessageState.ERROR | ERROR} — failed to produce. The UI shows an error treatment. Treat `ERROR` as terminal.

The state is required on every call. The chat does not keep state across calls. It applies your state to every item in the returned message. `STREAMING` and `COMPLETE` are not locked-terminal states. The chat treats "complete" as "complete as of now." So you can call `upsertMessage(id, MessageState.STREAMING, ...)` on an already-complete message to start re-streaming it. One example is a regenerate-with-streaming flow.

## Per-messageID serialization

Calls to the same `messageID` are serialized. Each call waits for the previous call to that ID before it runs. Calls to different `messageID`s run on their own, in parallel. So several messages can stream or update at once. Each message still stays internally consistent.

## When receive fires

`upsertMessage` fires {@link BusEventType.PRE_RECEIVE | PRE_RECEIVE} and {@link BusEventType.RECEIVE | RECEIVE} on one exact transition. That transition moves the message into `MessageState.COMPLETE` from any other state. This includes the case where the message did not exist before. `STREAMING`-to-`STREAMING` and `COMPLETE`-to-`COMPLETE` upserts do **not** fire these events.

The other delivery methods follow the same rule:

- {@link ChatInstanceMessaging.addMessage | addMessage} records `COMPLETE` and fires {@link BusEventType.RECEIVE | RECEIVE}. A one-shot complete insert is a transition to complete.
- {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk} records `STREAMING` for partial and complete-item chunks. It records `COMPLETE` on the {@link FinalResponseChunk | FinalResponseChunk}. That transition to complete fires {@link BusEventType.RECEIVE | RECEIVE}.

So regenerating a message that is already `COMPLETE` does not fire {@link BusEventType.RECEIVE | RECEIVE}. It is not a new turn landing. But inserting a brand-new `COMPLETE` message does fire it.

## User-defined responses

For `user_defined` items, `upsertMessage` reuses the existing {@link BusEventType.USER_DEFINED_RESPONSE | USER_DEFINED_RESPONSE} event. It fires once per user-defined item per call. This holds for both inserts and updates. The payload has an optional `state` field on {@link BusEventUserDefinedResponse | BusEventUserDefinedResponse}. That field carries the current {@link MessageState | MessageState} whenever the chat has a recorded lifecycle for the message. This includes messages from `upsertMessage`, {@link ChatInstanceMessaging.addMessage | addMessage}, and the final-response transition of {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk}. The field is additive, so existing consumers ignore it. In React, the same value sits on {@link RenderUserDefinedState | RenderUserDefinedState} as `state`.

**The chat keeps component identity across updates.** Repeated `upsertMessage` calls for the same item resolve to the same slot. So:

- **React consumers** — the slot name is the React `key`. So your component **re-renders with new props** instead of re-mounting. Local component state, animations, and side effects survive across updates.
- **Web component consumers** — the slot wrapper persists across calls. If element-level identity matters, return the same `HTMLElement` reference from `renderUserDefinedResponse`. Change its content imperatively. This is the established pattern from {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk}.

Nested `user_defined` items work inside {@link MessageResponseTypes.CARD | CARD}, {@link MessageResponseTypes.CAROUSEL | CAROUSEL}, and {@link MessageResponseTypes.GRID | GRID} containers. `upsertMessage` inherits the recursion logic from the existing event path.

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

**Streaming a single message (SSE-style).** One call per delta. The first call creates the message. Later calls update it. {@link BusEventType.RECEIVE | RECEIVE} fires once, on the final transition to `COMPLETE`. Each call returns a {@link MessageResponse | MessageResponse}.

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

**Regenerate (one-shot, non-streaming).** This fires {@link BusEventType.RECEIVE | RECEIVE} if `prev` did not exist or was not `COMPLETE`. It does not fire if `prev` was already `COMPLETE`. `request_id` is a field of {@link MessageResponse | MessageResponse}. It links the response to the user input it answers.

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

**Optimistic update.** Show a placeholder right away. Then replace it once the backend returns.

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

Cancellation works the same way for every delivery method. When the abort signal fires, stop your stream. Then call `upsertMessage` with `MessageState.COMPLETE`. This moves the message out of streaming and hides the "stop streaming" button. See [Cancelling request (stop streaming)](./CustomServer.md#cancelling-request-stop-streaming) for the full pattern and an `upsertMessage` finalization example.

## Related

- [Adding messages (legacy)](./AddMessageChunk.md) — the stable chunk-based streaming flow.
- [Server communication](./CustomServer.md) — wiring up {@link PublicConfigMessaging.customSendMessage | customSendMessage} and cancellation.
- React example: [examples/react/upsert-message-user-defined](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/upsert-message-user-defined) — a stateful steps-card widget updated in place over time.
- Web component example: [examples/web-components/upsert-message-user-defined](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/upsert-message-user-defined) — the same flow with `cds-aichat-custom-element`.
- Reasoning examples delivered through `upsertMessage` (the chunk-based reasoning demos ported to one full-snapshot upsert per update):
  - Reasoning steps — [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/upsert-message-reasoning-steps) / [Web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/upsert-message-reasoning-steps)
  - Reasoning steps (controlled) — [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/upsert-message-reasoning-steps-controlled) / [Web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/upsert-message-reasoning-steps-controlled)
  - Reasoning with streaming generic items — [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/upsert-message-reasoning-with-streaming-generic-items) / [Web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/upsert-message-reasoning-with-streaming-generic-items)
