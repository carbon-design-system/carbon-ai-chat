---
title: Adding messages (legacy)
---

### Overview

Stream a response onto the screen as your assistant produces it with {@link ChatInstanceMessaging.addMessageChunk}. The examples below call `instance.messaging`, so you need a {@link ChatInstance} first — get one from the `onBeforeRender` prop. It uses three types of chunks ({@link StreamChunk}) to progressively build and finalize a message response:

1. **Partial item chunks** — incremental updates to an individual item.
2. **Complete item chunks** — finalize one item while others keep streaming.
3. **Final response chunks** — the authoritative final state for the whole message.

For one-shot, non-streaming inserts use {@link ChatInstanceMessaging.addMessage} instead; your assistant can return responses in either format and switch between them. To accumulate state in your app and apply it with one call per update, see [Adding messages (experimental)](./UpsertMessage.md). It also covers regenerate and optimistic updates.

> **Note:** Before building on `addMessageChunk`, investigate {@link ChatInstanceMessaging.upsertMessage}. It inserts or updates a message by ID via an updater function, covering streaming, regenerate, post-stream corrections, and optimistic updates with one method. It is the recommended direction for new code, but experimental — its semantics and updater signature may still evolve. See [Adding messages (experimental)](./UpsertMessage.md).

The item and response shapes referenced below are documented in [Message format](./MessageFormat.md).

### Partial item chunks

Stream incremental updates to individual message items with a {@link PartialItemChunk}. Each chunk carries a {@link DeepPartial} of a {@link GenericItem} in `partial_item`, a per-message `streaming_metadata.response_id`, and a `streaming_metadata` on the item whose `id` picks the item to update and whose optional `cancellable` flag shows the "stop streaming" button. See {@link PartialItemChunk} and {@link StreamChunk} for the full field reference.

Partial chunks are stored raw in the item's internal chunks list. The render layer joins them at draw time for {@link TextItem} and {@link ConversationalSearchItem} only, concatenating `text` fields. Other response types are not auto-joined. If you stream non-text items, include the fully assembled state in the {@link CompleteItemChunk} or {@link FinalResponseChunk}. Multiple items can stream in parallel within the same message by using different item IDs.

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
      chain_of_thought: currentSteps,
    },
  },
};
await instance.messaging.addMessageChunk(chunk);
```

### Complete item chunks

A complete item chunk ({@link CompleteItemChunk}) finalizes a specific item before the entire message is done. Use a complete item chunk when you:

- Need to correct or finalize one item while others are still streaming
- Are streaming multiple different items and want to mark one as complete
- Want to run post-processing (such as safety checks) on an item

The complete item should contain all final data for that item, including any corrections to previous chunks.

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
      chain_of_thought: finalSteps,
    },
  },
};
await instance.messaging.addMessageChunk(chunk);
```

If you're only streaming a single item, you can skip this step and go directly to the final response.

### Final response chunks

The final response chunk ({@link FinalResponseChunk}) signals the end of all streaming and provides the authoritative final state. It carries the complete {@link MessageResponse} with all items. See {@link FinalResponseChunk} for the full field reference. When you send it:

- It triggers cleanup of streaming UI states (such as hiding "stop streaming" buttons)
- Set its `id` to match the `response_id` from previous chunks
- For any item that was streamed, include `streaming_metadata.id` to preserve identity
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
    chain_of_thought: chainOfThought,
  },
};

await instance.messaging.addMessageChunk({
  final_response: finalResponse,
});
```

### Typical streaming flow

1. Generate a unique `response_id` for the message
2. Loop through your streaming source, sending partial item chunks for each update
3. (Optional) Send complete item chunks when individual items are finalized
4. Send a final response chunk with the complete message

The Carbon AI Chat appends partial text updates at draw time (for {@link TextItem} and {@link ConversationalSearchItem}), renders streaming text, and transitions to the final state when the final response chunk arrives.

### Cancellation

The "stop streaming" button appears when a partial item chunk has `streaming_metadata.cancellable: true`, and the abort signal lets you stop your stream. The cancellation mechanism is identical across delivery flows — see [Cancelling request (stop streaming)](./CustomServer.md#cancelling-request-stop-streaming) on the Server communication page for the full pattern, including how to deliver the final state with either `addMessageChunk` or `upsertMessage`.

### Related

- [Adding messages (experimental)](./UpsertMessage.md) — accumulate state in your app and apply one update per call.
- [Message format](./MessageFormat.md) — the item and response shapes used here.
- [Server communication](./CustomServer.md#cancelling-request-stop-streaming) — the shared cancellation pattern.
