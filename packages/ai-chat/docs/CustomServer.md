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

Connect the Carbon AI Chat to your own server. It supports streaming results, non-streaming results, or a mix of both. You can take on two responsibilities:

1. **Exchanging messages** — receive a {@link MessageRequest | message request} when a user sends a message, and deliver a {@link MessageResponse | message response} back. This page shows how to wire that up with {@link PublicConfigMessaging.customSendMessage | customSendMessage}.
2. **Persisting history** — restore past conversations when the chat reopens. See [Conversation history](./CustomHistory.md).

Where you go next depends on what you build:

- [Message format](./MessageFormat.md) — the shape of the requests you receive and responses you return (for server / API authors).
- [Adding messages (legacy)](./AddMessageChunk.md) — the stable chunk-based streaming flow.
- [Adding messages (experimental)](./UpsertMessage.md) — the preferred, experimental insert-or-update-by-ID flow.
- [Structured data](./StructuredData.md) — send typed fields and uploaded files alongside the user's text.
- [Conversation history](./CustomHistory.md) — load and restore past conversations.
- [Session state persistence](./StatePersistence.md) — own where the chat's session and UI state is stored.

## Connecting your server

You pass your custom messaging configuration as part of the {@link PublicConfig | config}. You must provide a {@link PublicConfigMessaging.customSendMessage | customSendMessage} function, which the chat calls whenever the user sends a message. It also runs when you call {@link ChatInstance.send | send}.

For more information, see [the examples page](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/basic-float/src/customSendMessage.ts).

The chat passes this function three parameters:

1. {@link MessageRequest}: the message being sent.
2. {@link CustomSendMessageOptions}: options for that message, including an abort signal to cancel the request.
3. {@link ChatInstance}: the Carbon AI Chat `instance` object.

The function can return nothing, or it can return a promise. If you return a promise, the chat does this:

1. Set up a message queue, passing the next message to your function only after the current one completes.
2. Show a loading indicator if the message takes a while to return (or to return its first chunk if streaming).
3. Throw a visible error and pass an abort signal if the wait exceeds the `messaging.messageTimeoutSecs` timeout, which you set in your {@link PublicConfig} with {@link PublicConfigMessaging.messageTimeoutSecs | messageTimeoutSecs}.

If you do not return a promise, the chat does not queue your messages, and it skips the loading indicator when no first chunk comes back.

## Delivering responses

When you have a response, or part of one, push it to the screen through {@link ChatInstanceMessaging | messaging}. You have two flows, and your assistant can return either format and switch between them:

- **Stable flow** — use {@link ChatInstanceMessaging.addMessage | addMessage} for one-shot, non-streaming inserts, and {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk} for chunked streaming. Both are fully supported, with no deprecation. See [Adding messages (legacy)](./AddMessageChunk.md).
- **Preferred flow (experimental)** — {@link ChatInstanceMessaging.upsertMessage | upsertMessage} inserts or updates a message by ID through an updater function, covering streaming, regenerate, post-stream fixes, and optimistic updates with one method. It is the recommended path for new code, but experimental: its semantics and updater signature may still change. See [Adding messages (experimental)](./UpsertMessage.md).

For the data shape in either flow, see [Message format](./MessageFormat.md).

## Cancelling request (stop streaming)

While content streams, users can stop the stream in two ways:

1. Clicking the "stop streaming" button in the input field
2. Restarting or clearing the conversation

Both actions cancel the request. Cancellation works the same across flows: the same abort signal works whether you deliver responses with {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk} or {@link ChatInstanceMessaging.upsertMessage | upsertMessage}. Only the way you deliver the final state differs.

### 1. Mark your stream as cancellable

Set `cancellable: true` in the {@link ItemStreamingMetadata | streaming metadata} of the items you stream. The "stop streaming" button appears whenever a streaming item has `cancellable: true`.

With {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk}, set it on the partial item chunk as a {@link StreamChunk | stream chunk}:

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

With {@link ChatInstanceMessaging.upsertMessage | upsertMessage}, set it on the item in the message your updater returns while the message is in the {@link MessageState.STREAMING | streaming} state.

### 2. Listen for cancellation

The {@link CustomSendMessageOptions.signal | abort signal} fires when a message request is cancelled. On abort, the signal's `reason` holds one value from the {@link CancellationReason} enum:

- {@link CancellationReason.STOP_STREAMING} (`"Stop streaming"`) - the user clicked the stop streaming button
- {@link CancellationReason.CONVERSATION_RESTARTED} (`"Conversation restarted"`) - the user restarted or cleared the conversation
- {@link CancellationReason.TIMEOUT} (`"Request timeout"`) - the request exceeded the configured timeout

Check whether the request was cancelled with `signal.aborted`, or by listening for the "abort" event, and read the reason from `signal.reason`. The abort signal handles every cancellation the same way.

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

When you detect cancellation, exit your streaming loop and move the message out of the streaming state. How you deliver that final state depends on your flow.

#### With addMessageChunk

Send a {@link FinalResponseChunk | final response chunk}. Optionally send a {@link CompleteItemChunk | complete item chunk} with `stream_stopped: true` first, to trigger the right a11y states:

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

Call {@link ChatInstanceMessaging.upsertMessage | upsertMessage} with {@link MessageState.COMPLETE | the complete state}, which moves the message out of streaming and hides the "stop streaming" button. Set `streaming_metadata.stream_stopped: true` on the items to trigger the "Response stopped" a11y announcement:

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
- Clicking the button fires the abort signal (with reason {@link CancellationReason.STOP_STREAMING}), but it does not stop your streaming on its own.
- You must listen for the abort signal, stop your streaming logic, and deliver the final state.
- The abort signal also fires on conversation restarts and clears ({@link CancellationReason.CONVERSATION_RESTARTED}) and on timeouts ({@link CancellationReason.TIMEOUT}).
- With {@link ChatInstanceMessaging.addMessageChunk | addMessageChunk}, the button stays visible but disabled until a {@link FinalResponseChunk | final response chunk} arrives. With {@link ChatInstanceMessaging.upsertMessage | upsertMessage}, it hides when the message reaches {@link MessageState.COMPLETE | complete} (or {@link MessageState.ERROR | error}). Always deliver the final state, even when cancelled, to clean up UI state.
- If a {@link CancellationReason.TIMEOUT | timeout} cancels the message, the UI marks it as errored.

## Welcome messages

By default, if the homescreen is disabled, the chat sends a {@link MessageRequest | message request} the first time a user opens it, with `input.text` set to a blank string and `history.is_welcome_request` set to true. This lets you inject a hard-coded greeting. To skip it, set {@link PublicConfigMessaging.skipWelcome | skipWelcome} to `true`.

To send your own welcome message, set {@link PublicConfigMessaging.skipWelcome | skipWelcome} to `true` and deliver the greeting yourself. For example, you might vary the text by user and respond in kind. Call {@link ChatInstanceMessaging.addMessage | addMessage} for a one-shot greeting, or {@link ChatInstanceMessaging.upsertMessage | upsertMessage} if you want to update that greeting later.

## Message loading indicators

By default, the chat shows a loading indicator if no chunk or message arrives before your {@link PublicConfigMessaging.messageLoadingIndicatorTimeoutSecs | loading-indicator timeout} expires. To turn off this auto-show, set {@link PublicConfigMessaging.messageLoadingIndicatorTimeoutSecs | that timeout} to 0. If your message streams slowly, has many thinking steps, or makes long-running API calls, turn the loading indicator on yourself with {@link ChatInstance.updateIsChatLoadingCounter | updateIsChatLoadingCounter}.

## Related

- [Message format](./MessageFormat.md) — the shape of the requests you receive and responses you return.
- [Adding messages (legacy)](./AddMessageChunk.md) — the chunk-based streaming flow.
- [Adding messages (experimental)](./UpsertMessage.md) — insert or update a message by ID.
- [Structured data](./StructuredData.md) — send typed fields and uploaded files alongside the user's text.
- [Conversation history](./CustomHistory.md) — load and restore past conversations.
