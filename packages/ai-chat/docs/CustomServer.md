---
title: Server communication
children:
  - ./MessageFormat.md
  - ./AddMessageChunk.md
  - ./UpsertMessage.md
  - ./StructuredData.md
  - ./CustomHistory.md
  - ./StatePersistence.md
---

## Overview

You can connect the Carbon AI Chat to your own server. It supports both streaming and non-streaming results, or a mixture of both. There are two responsibilities you can implement:

1. **Exchanging messages** — receive a {@link MessageRequest} when a user sends a message, and deliver a {@link MessageResponse} back. This page covers wiring that up with {@link PublicConfigMessaging.customSendMessage}.
2. **Persisting history** — restore previous conversations when the chat reopens. See [Conversation history](./CustomHistory.md).

This page is the entry point. Depending on what you are building, continue to:

- [Message format](./MessageFormat.md) — the shape of the requests you receive and responses you return (for server / API authors).
- [Adding messages (legacy)](./AddMessageChunk.md) — the stable chunk-based streaming flow.
- [Adding messages (experimental)](./UpsertMessage.md) — the preferred, experimental insert-or-update-by-ID flow.
- [Structured data](./StructuredData.md) — send typed fields and uploaded files alongside the user's text.
- [Conversation history](./CustomHistory.md) — loading and restoring previous conversations.
- [Session state persistence](./StatePersistence.md) — own where the chat's session and UI state is stored.

## Connecting your server

The Carbon AI Chat takes custom messaging server configuration as part of its {@link PublicConfig}. You must provide a {@link PublicConfigMessaging.customSendMessage} function that the Carbon AI Chat calls any time the user sends a message. It also gets called when you use {@link ChatInstance.send}.

For more information, see [the examples page](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/basic/src/customSendMessage.ts).

In this function, the Carbon AI Chat passes three parameters:

1. {@link MessageRequest}: The message being sent.
2. {@link CustomSendMessageOptions}: Options about that message. This includes an abort signal to cancel the request.
3. {@link ChatInstance}: The Carbon AI Chat `instance` object.

This function can return nothing or it can return a promise object. If you return a promise object, the Carbon AI Chat does the following:

1. Set up a message queue and only pass the next message to your function when the message completes.
2. Show a loading indicator if the message is taking a while to return (or return its first chunk if streaming).
3. Throw a visible error and pass an abort signal if waiting for the message exceeds the `messaging.messageTimeoutSecs` timeout identified in your {@link PublicConfig} with {@link PublicConfigMessaging.messageTimeoutSecs}.

If you do not return a promise object, the Carbon AI Chat does not queue messages for you or show any loading indicator if no first chunk is returned.

## Delivering responses

Once you have a response (or part of one), you push it onto the screen through {@link ChatInstanceMessaging}. There are two flows, and your assistant can return responses in either format and switch between them:

- **Stable flow** — {@link ChatInstanceMessaging.addMessage} for one-shot, non-streaming inserts, and {@link ChatInstanceMessaging.addMessageChunk} for chunked streaming. Fully supported with no deprecation. See [Adding messages (legacy)](./AddMessageChunk.md).
- **Preferred flow (experimental)** — {@link ChatInstanceMessaging.upsertMessage} inserts or updates a message by ID via an updater function, covering streaming, regenerate, post-stream corrections, and optimistic updates with one method. It is the recommended direction for new code, but experimental — its semantics and updater signature may still evolve. See [Adding messages (experimental)](./UpsertMessage.md).

For the shape of the data you return in either flow, see [Message format](./MessageFormat.md).

## Cancelling request (stop streaming)

When streaming content, users can request to stop the stream in two ways:

1. Clicking the "stop streaming" button in the input field
2. Restarting or clearing the conversation

Both actions trigger request cancellation. The cancellation mechanism is identical across delivery flows — the same abort signal works whether you deliver responses with {@link ChatInstanceMessaging.addMessageChunk} or {@link ChatInstanceMessaging.upsertMessage}. Only the way you deliver the final state differs.

### 1. Mark your stream as cancellable

Set `cancellable: true` in the {@link ItemStreamingMetadata} of the items you are streaming. The "stop streaming" button appears whenever a streaming item has `cancellable: true`.

With {@link ChatInstanceMessaging.addMessageChunk}, set it on the partial item chunk as a {@link StreamChunk}:

```typescript
const chunk: StreamChunk = {
  partial_item: {
    response_type: MessageResponseTypes.TEXT,
    text: streamedText,
    streaming_metadata: {
      id: "1",
      cancellable: true, // Shows the "stop streaming" button
    },
  },
  streaming_metadata: {
    response_id: responseID,
  },
};
```

With {@link ChatInstanceMessaging.upsertMessage}, set it on the item in the message your updater returns while the message is in {@link MessageState.STREAMING}.

### 2. Listen for cancellation

The {@link CustomSendMessageOptions.signal} abort signal is triggered when a message request is cancelled. When aborted, the signal's `reason` property contains one of the values from the {@link CancellationReason} enum:

- {@link CancellationReason.STOP_STREAMING} (`"Stop streaming"`) - User clicked the stop streaming button
- {@link CancellationReason.CONVERSATION_RESTARTED} (`"Conversation restarted"`) - User restarted or cleared the conversation
- {@link CancellationReason.TIMEOUT} (`"Request timeout"`) - Request exceeded the configured timeout duration

You can check if the request was cancelled using `signal.aborted` or by listening to the "abort" event, and access the specific reason via `signal.reason`. The abort signal provides unified handling for all cancellation scenarios.

```typescript
import { CancellationReason } from "@carbon/ai-chat";

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  let isCanceled = false;

  // Listen to abort signal (handles stop button, restart/clear, and timeout)
  const abortHandler = () => {
    isCanceled = true;
    const reason = requestOptions.signal?.reason;

    // Use enum for type-safe comparisons
    if (reason === CancellationReason.STOP_STREAMING) {
      console.log("User clicked stop streaming");
    } else if (reason === CancellationReason.CONVERSATION_RESTARTED) {
      console.log("Conversation was restarted/cleared");
    } else if (reason === CancellationReason.TIMEOUT) {
      console.log("Request timed out");
    }

    // Stop your streaming loop and prepare to send the final response
  };
  requestOptions.signal?.addEventListener("abort", abortHandler);

  try {
    // Your streaming logic here, checking isCanceled periodically
    while (!isCanceled && hasMoreData) {
      // Stream chunks or upsert updates...
    }
  } finally {
    requestOptions.signal?.removeEventListener("abort", abortHandler);
  }
}
```

### 3. Deliver the final state

When cancellation is detected, exit your streaming loop and transition the message out of the streaming state. How you deliver that final state depends on which flow you are using.

#### With addMessageChunk

Send a {@link FinalResponseChunk}. Optionally send a {@link CompleteItemChunk} with `stream_stopped: true` first to trigger the appropriate a11y states:

```typescript
// Optional: mark the item as stopped for a11y messaging.
await instance.messaging.addMessageChunk({
  complete_item: {
    response_type: MessageResponseTypes.TEXT,
    text: partialText, // The text generated before cancellation
    streaming_metadata: {
      id: "1",
      stream_stopped: true,
    },
  },
  streaming_metadata: {
    response_id: responseID,
  },
});

// Always send the final response to clean up streaming UI state.
await instance.messaging.addMessageChunk({
  final_response: {
    id: responseID,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: partialText,
        },
      ],
    },
  },
});
```

#### With upsertMessage

Call {@link ChatInstanceMessaging.upsertMessage} with {@link MessageState.COMPLETE}. This transitions the message out of streaming and hides the "stop streaming" button. Set `streaming_metadata.stream_stopped: true` on the items to trigger the "Response stopped" a11y announcement:

```typescript
await instance.messaging.upsertMessage(
  messageID,
  MessageState.COMPLETE,
  (prev) => ({
    ...prev!,
    output: {
      generic:
        prev?.output.generic?.map((item) => ({
          ...item,
          streaming_metadata: {
            ...item.streaming_metadata,
            stream_stopped: isCanceled || undefined,
          },
        })) ?? [],
    },
  }),
);
```

### Important notes

- The "stop streaming" button appears when a streaming item has `cancellable: true`.
- Clicking the button triggers the abort signal (with reason {@link CancellationReason.STOP_STREAMING}), but does not automatically stop your streaming.
- You must listen to the abort signal, stop your streaming logic, and deliver the final state.
- The abort signal is also triggered for conversation restarts/clears ({@link CancellationReason.CONVERSATION_RESTARTED}) and timeouts ({@link CancellationReason.TIMEOUT}).
- With {@link ChatInstanceMessaging.addMessageChunk}, the button remains visible (disabled) until a {@link FinalResponseChunk} is received; with {@link ChatInstanceMessaging.upsertMessage}, it hides when the message transitions to {@link MessageState.COMPLETE} (or {@link MessageState.ERROR}). Always deliver the final state, even when cancelled, to properly clean up UI state.
- If the message was cancelled because of a {@link CancellationReason.TIMEOUT}, the UI marks the message as errored.

## Welcome messages

By default, if the homescreen is disabled, the Carbon AI Chat sends a {@link MessageRequest} with `input.text` set to a blank string and `history.is_welcome_request` set to true when a user first opens the chat. This lets you inject a hard-coded greeting. To skip it, set {@link PublicConfigMessaging.skipWelcome} to `true`.

If you want to send your own "welcome" message (e.g. you send different text depending on the user and respond in kind) you can set {@link PublicConfigMessaging.skipWelcome} to `true` and deliver the greeting yourself — call {@link ChatInstanceMessaging.addMessage} for a one-shot greeting, or {@link ChatInstanceMessaging.upsertMessage} if you want to update that greeting later.

## Message loading indicators

By default, the chat shows a loading indicator if it does not get back a chunk or message before {@link PublicConfigMessaging.messageLoadingIndicatorTimeoutSecs} expires. You can turn off this auto-showing of a loading indicator in this case by setting {@link PublicConfigMessaging.messageLoadingIndicatorTimeoutSecs} to 0. If your message is taking a long time to stream or has many thinking steps or long running API calls, toggle the loading indicator on manually using {@link ChatInstance.updateIsChatLoadingCounter}.

## Related

- [Message format](./MessageFormat.md) — the shape of the requests you receive and responses you return.
- [Adding messages (legacy)](./AddMessageChunk.md) — the chunk-based streaming flow.
- [Adding messages (experimental)](./UpsertMessage.md) — insert or update a message by ID.
- [Structured data](./StructuredData.md) — send typed fields and uploaded files alongside the user's text.
- [Conversation history](./CustomHistory.md) — loading and restoring previous conversations.
