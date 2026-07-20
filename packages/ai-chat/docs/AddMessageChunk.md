---
title: Adding messages (legacy)
---

## Overview

Stream a response onto the screen as your assistant produces it with {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk}. The examples below call `instance.messaging`, so you need a {@link ChatInstance} first — get one from the `onBeforeRender` prop. It uses three chunk types ({@link StreamChunk | StreamChunk}) to build and finish a message response step by step:

- **Partial item chunks** — step-by-step updates to one item.
- **Complete item chunks** — finalize one item while others keep streaming.
- **Final response chunks** — the authoritative final state for the whole message.

For a one-shot, non-streaming insert, use {@link ChatInstanceMessaging.addMessage | addMessage} instead; your assistant can return either format and switch between them. To build up state in your app and apply it with one call per update, see [Adding messages (experimental)](./UpsertMessage.md). It also covers regenerate and optimistic updates.

> **Note:** Before you build on `addMessageChunk`, look at {@link ChatInstanceMessaging.upsertMessage | upsertMessage}. A single method inserts or updates a message by ID through an updater function, covering streaming, regenerate, post-stream corrections, and optimistic updates. It's the recommended path for new code, but experimental — its semantics and updater signature may still change. See [Adding messages (experimental)](./UpsertMessage.md).

[Message format](./MessageFormat.md) documents the item and response shapes used below.

## Partial item chunks

Stream updates to single message items with a {@link PartialItemChunk | PartialItemChunk}. Each chunk carries a {@link DeepPartial} of a {@link GenericItem} in `partial_item`, a per-message `streaming_metadata.response_id`, and a `streaming_metadata` on the item whose `id` picks the item to update and whose optional `cancellable` flag shows the "stop streaming" button. See {@link PartialItemChunk} and {@link StreamChunk} for the full field reference.

The chat stores partial chunks raw in the item's internal chunks list. At draw time, the render layer joins them for {@link TextItem | TextItem} and {@link ConversationalSearchItem | ConversationalSearchItem} only, concatenating the `text` fields. Other response types are not auto-joined. If you stream non-text items, include the fully built state in the {@link CompleteItemChunk | CompleteItemChunk} or {@link FinalResponseChunk | FinalResponseChunk}. To stream several items at once in one message, give each a different item ID.

Example:

```typescript
const chunk: StreamChunk = {
  partial_item: {
    response_type: MessageResponseTypes.TEXT,
    text: `${new_chunk}`,
    streaming_metadata: {
      id: "1", // Identifies this item within the message
      cancellable: true, // Shows "stop streaming" button
    },
  },
  streaming_metadata: {
    response_id: responseID, // Identifies the entire message
  },
  partial_response: {
    message_options: {
      response_user_profile: userProfile,
      reasoning: currentReasoning,
    },
  },
};
await instance.messaging.addMessageChunk(chunk);
```

## Complete item chunks

A complete item chunk ({@link CompleteItemChunk | CompleteItemChunk}) finalizes one item before the whole message is done. Use one when you:

- Need to correct or finalize one item while others still stream
- Stream several different items and want to mark one complete
- Want to run post-processing on an item, such as safety checks

The complete item should hold all final data for that item, including any fixes to earlier chunks.

Example:

```typescript
const chunk: StreamChunk = {
  complete_item: {
    response_type: MessageResponseTypes.TEXT,
    text: finalText, // Complete, corrected text
    streaming_metadata: {
      id: "1",
      stream_stopped: wasCancelled, // Indicates if user cancelled
    },
  },
  streaming_metadata: {
    response_id: responseID,
  },
  partial_response: {
    message_options: {
      response_user_profile: userProfile,
      reasoning: finalReasoning,
    },
  },
};
await instance.messaging.addMessageChunk(chunk);
```

If you stream only one item, skip this step and go straight to the final response.

## Final response chunks

The final response chunk ({@link FinalResponseChunk | FinalResponseChunk}) signals the end of all streaming and provides the authoritative final state. It carries the full {@link MessageResponse | MessageResponse} with all items. See {@link FinalResponseChunk} for the full field reference. When you send it:

- It clears streaming UI state, such as hiding the "stop streaming" buttons
- Set its `id` to match the `response_id` from earlier chunks
- For any streamed item, include `streaming_metadata.id` to keep its identity
- Save this in your history store

Example:

```typescript
const finalResponse: MessageResponse = {
  id: responseID,
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: finalText,
        streaming_metadata: {
          id: "1",
        },
        message_item_options: {
          feedback: feedbackOptions,
        },
      },
    ],
  },
  message_options: {
    response_user_profile: userProfile,
    reasoning: reasoningSteps,
  },
};

await instance.messaging.addMessageChunk({
  final_response: finalResponse,
});
```

## Typical streaming flow

Generate a unique `response_id` for the message, then loop through your streaming source and send a partial item chunk for each update. As individual items finalize, you can send complete item chunks. Finish with a final response chunk that carries the complete message.

At draw time, Carbon AI Chat appends partial text updates for {@link TextItem} and {@link ConversationalSearchItem}, renders the streaming text, and moves to the final state when the final response chunk arrives.

## Cancellation

The "stop streaming" button appears when a partial item chunk sets `streaming_metadata.cancellable: true`, and the abort signal lets you stop your stream. Cancellation works the same across delivery flows — see [Cancelling request (stop streaming)](./CustomServer.md#cancelling-request-stop-streaming) on the Server communication page for the full pattern, including how to deliver the final state with either `addMessageChunk` or `upsertMessage`.

## Related

- [Adding messages (experimental)](./UpsertMessage.md) — build up state in your app and apply one update per call.
- [Message format](./MessageFormat.md) — the item and response shapes used here.
- [Server communication](./CustomServer.md#cancelling-request-stop-streaming) — the shared cancellation pattern.
