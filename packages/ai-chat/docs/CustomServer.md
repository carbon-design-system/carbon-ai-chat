---
title: Server communication
---

### Overview

The Carbon AI Chat allows you to provide your own server for the chat to interact with. It supports both streaming and non-streaming results, or a mixture of both. Here we are going to cover the life-cycle of sending a message from the chat to your assistant and back.

### Creating your custom messaging server

The Carbon AI Chat provides a {@link MessageRequest} when someone sends a message. The Carbon AI Chat expects a {@link MessageResponse} to be returned. You can stream the `MessageResponse`. See {@link ChatInstanceMessaging.addMessageChunk} for an explanation of the streaming format.

For more information, see [the examples page](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/basic/src/customSendMessage.ts).

Inside the `MessageResponse` the Carbon AI Chat can accept `response_types`. You can navigate to the properties for each `response_type` by visiting the base {@link GenericItem} type.

The Carbon AI Chat takes custom messaging server configuration as part of its {@link PublicConfig}. You are required to provide a `messaging.customSendMessage` (see {@link PublicConfigMessaging.customSendMessage}) function that the Carbon AI Chat calls any time the user sends a message. It also gets called if you make use of the `send` function on {@link ChatInstance}.

In this function, the Carbon AI Chat passes three parameters:

1. {@link MessageRequest}: The message being sent.
2. {@link CustomSendMessageOptions}: Options about that message. This includes an abort signal to cancel the request.
3. {@link ChatInstance}: The Carbon AI Chat `instance` object.

This function can return nothing or it can return a promise object. If you return a promise object, the Carbon AI Chat does the following actions:

1. Set up a message queue and only pass the next message to your function when the message completes.
2. Show a loading indicator if the message is taking a while to return (or return its first chunk if streaming).
3. Throw a visible error and pass an abort signal if waiting for the message exceeds the `messaging.messageTimeoutSecs` timeout identified in your {@link PublicConfig} with {@link PublicConfigMessaging.messageTimeoutSecs}.

If you do not return a promise object, the Carbon AI Chat does not queue messages for you or show any loading indicator if no first chunk is returned.

#### Adding responses back to the chat

For streaming operations see {@link ChatInstanceMessaging.addMessageChunk}. For non-streaming responses see {@link ChatInstanceMessaging.addMessage}. Your assistant can return responses in either format and can switch between.

##### Streaming lifecycle with addMessageChunk

The streaming API uses three types of chunks ({@link StreamChunk}) to progressively build and finalize a message response:

###### 1. Partial item chunks

Partial item chunks ({@link PartialItemChunk}) allow you to stream incremental updates to individual message items. Each chunk contains:

- `partial_item`: A {@link DeepPartial} of a {@link GenericItem} with the new content to merge
- `streaming_metadata.response_id`: A unique ID for the entire message response
- `streaming_metadata` on the item: Contains an `id` to identify which item is being updated, and optional `cancellable` flag

The client automatically merges partial chunks into the existing item based on the item's `streaming_metadata.id`. For text items, new text is appended. Multiple items can stream in parallel within the same message by using different item IDs.

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

###### 2. Complete item chunks

A complete item chunk ({@link CompleteItemChunk}) finalizes a specific item before the entire message is done. This is useful when:

- You need to correct or finalize one item while others are still streaming
- You're streaming multiple different items and want to mark one as complete
- You want to run post-processing (like safety checks) on an item

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

###### 3. Final response chunks

The final response chunk ({@link FinalResponseChunk}) signals the end of all streaming and provides the authoritative final state. This:

- Triggers cleanup of streaming UI states (like hiding "stop streaming" buttons)
- Should contain the complete {@link MessageResponse} with all items
- Must have an `id` matching the `response_id` from previous chunks
- For any item that was streamed, include `streaming_metadata.id` to preserve identity
- Represents what you should save in your history store.

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

###### Typical streaming flow

1. Generate a unique `response_id` for the message
2. Loop through your streaming source, sending partial item chunks for each update
3. (Optional) Send complete item chunks when individual items are finalized
4. Send a final response chunk with the complete message

The Carbon AI Chat handles merging partial updates, rendering streaming text, and transitioning to the final state automatically.

#### Cancelling request (stop streaming)

When streaming content, users can request to stop the stream in two ways:

1. Clicking the "stop streaming" button in the input field
2. Restarting or clearing the conversation

Both actions trigger request cancellation. To handle this:

##### 1. Mark your stream as cancellable

Set `cancellable: true` in the {@link ItemStreamingMetadata} of your partial item chunks:

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

##### 2. Listen for cancellation (choose one approach)

###### Option A: Using the abort signal (recommended)

The {@link CustomSendMessageOptions.signal} abort signal is triggered when a message request is cancelled. When aborted, the signal's `reason` property contains one of the values from the {@link CancellationReason} enum:

- {@link CancellationReason.STOP_STREAMING} (`"Stop streaming"`) - User clicked the stop streaming button
- {@link CancellationReason.CONVERSATION_RESTARTED} (`"Conversation restarted"`) - User restarted or cleared the conversation
- {@link CancellationReason.TIMEOUT} (`"Request timeout"`) - Request exceeded the configured timeout duration

You can check if the request was cancelled using `signal.aborted` or by listening to the "abort" event, and access the specific reason via `signal.reason`.

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
      // Stream chunks...
    }
  } finally {
    requestOptions.signal?.removeEventListener("abort", abortHandler);
  }
}
```

###### Option B: Using the STOP_STREAMING event

Subscribe to the {@link BusEventType.STOP_STREAMING} event. Note that this event is only fired for stop button clicks, not for conversation restarts/clears:

```typescript
let isCanceled = false;

const stopGeneratingEvent = {
  type: BusEventType.STOP_STREAMING,
  handler: () => {
    isCanceled = true;
    // Stop your streaming loop and prepare to send the final response
    instance.off(stopGeneratingEvent); // Clean up the listener
  },
};

instance.on(stopGeneratingEvent);
```

**Note:** Using the abort signal (Option A) is recommended as it provides unified handling for all cancellation scenarios.

##### 3. Stop streaming and send the final response

When cancellation is detected, exit your streaming loop and send the final response chunk. You have two options:

###### Option A: Send final response directly (simpler)

You can skip the complete item chunk and go directly to the final response:

```typescript
const finalResponse: MessageResponse = {
  id: responseID,
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: partialText, // The text generated before cancellation
      },
    ],
  },
};

await instance.messaging.addMessageChunk({
  final_response: finalResponse,
});
```

###### Option B: Send complete item chunk first (optional)

If you want to explicitly indicate the stream was stopped (which triggers appropriate a11y states), you can optionally send a {@link CompleteItemChunk} with `stream_stopped: true` before the final response:

```typescript
// Optional: Send complete item with stream_stopped flag
const chunk: StreamChunk = {
  complete_item: {
    response_type: MessageResponseTypes.TEXT,
    text: partialText, // The text generated before cancellation
    streaming_metadata: {
      id: "1",
      stream_stopped: true, // Triggers appropriate a11y states and messaging
    },
  },
  streaming_metadata: {
    response_id: responseID,
  },
};

await instance.messaging.addMessageChunk(chunk);

// Then send the final response
const finalResponse: MessageResponse = {
  id: responseID,
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: partialText,
      },
    ],
  },
};

await instance.messaging.addMessageChunk({
  final_response: finalResponse,
});
```

After receiving the final response, the Carbon AI Chat will hide the "stop streaming" button and enable normal input functionality.

##### Important notes

- The "stop streaming" button appears when any partial item chunk has `cancellable: true`
- Clicking the button triggers the abort signal (with reason {@link CancellationReason.STOP_STREAMING}) and fires the {@link BusEventType.STOP_STREAMING} event, but does not automatically stop your streaming
- You must listen to the abort signal (recommended) or the STOP_STREAMING event, stop your streaming logic, and send completion chunks
- The abort signal is also triggered for conversation restarts/clears ({@link CancellationReason.CONVERSATION_RESTARTED}) and timeouts ({@link CancellationReason.TIMEOUT})
- The button remains visible (disabled) until a {@link FinalResponseChunk} is received
- Always send a final response chunk, even when cancelled, to properly clean up UI state
- If the message was cancelled because of ({@link CancellationReason.TIMEOUT}) the message will be marked as having errored in the UI.

#### Welcome messages

By default, if the homescreen is disabled, the Carbon AI Chat sends a {@link MessageRequest} with `input.text` set to a blank string and `history.is_welcome_request` set to true when a user first opens the chat. It is to allow you to inject a hard coded greeting response to the user. If you do not wish to use this functionality, you can set `messaging.skipWelcome` to `true`. See {@link PublicConfigMessaging.skipWelcome}.

If you want to send your own "welcome" message (e.g. you send different text depending on the user and respond in kind) you can set `messaging.skipWelcome` to `true` and call `instance.messaging.addMessage` ({@link ChatInstanceMessaging.addMessage}) on your own.

#### Message loading indicators

By default, the chat will show a loading indicator if it does not get back a chunk or message before `messaging.messageLoadingIndicatorTimeoutSecs` expires. You can turn off this auto-showing of a loading indicator in this case by setting `messaging.messageLoadingIndicatorTimeoutSecs` to 0. If your message is taking a long time to stream or has many thinking steps or long running API calls, you may want to toggle the loading indicator on manually using {@link ChatInstance.updateIsChatLoadingCounter}.

### Creating your custom history store

The Carbon AI Chat allows you to implement custom history loading to restore previous conversations when the chat is opened. History is represented as an array of {@link HistoryItem} objects, where each item contains either a {@link MessageRequest} or {@link MessageResponse} along with a timestamp.

**Note:** The Carbon AI Chat only handles UI-level history (displaying previous messages). There is currently no recommended strategy for storing LLM-friendly conversation history if that is part of your use case.

#### History data structure

Each {@link HistoryItem} contains:

- `message`: Either a {@link MessageRequest} (user message) or {@link MessageResponse} (assistant message)
- `time`: ISO 8601 formatted timestamp (e.g., `2020-03-15T08:59:56.952Z`)

The messages should include their `history` property ({@link MessageRequestHistory} or {@link MessageResponseHistory}) which stores metadata like timestamps, labels, error states, and feedback.

#### Loading history on startup

To automatically load history when the chat opens, define a {@link PublicConfigMessaging.customLoadHistory} function in your {@link PublicConfig}:

```typescript
const config = {
  messaging: {
    customLoadHistory: async (instance: ChatInstance) => {
      // Fetch history from your backend
      const history = await fetchHistoryFromAPI();

      // Return array of HistoryItem objects
      return history;
    },
  },
};
```

This function:

- Receives the {@link ChatInstance} as a parameter
- Should return a `Promise<HistoryItem[]>`
- Is called once during the chat's hydration process
- Cannot be changed after initial load

The Carbon AI Chat automatically calls {@link ChatInstanceMessaging.insertHistory} with the returned items.

#### Manually loading history

For advanced use cases (like switching between conversations), you can skip `customLoadHistory` and directly call {@link ChatInstanceMessaging.insertHistory}:

```typescript
// Load history manually
await instance.messaging.insertHistory(historyItems);
```

This method:

- Fires {@link BusEventType.HISTORY_BEGIN} and {@link BusEventType.HISTORY_END} events
- Can be called multiple times
- Does not clear existing messages (use {@link ChatInstanceMessaging.clearConversation} first if needed)

#### Switching between conversations

When users need to switch between different conversations:

```typescript
// Clear the current conversation
await instance.messaging.clearConversation();

// Load the new conversation's history
await instance.messaging.insertHistory(newConversationHistory);
```

{@link ChatInstanceMessaging.clearConversation} will:

- Trigger a restart of the conversation
- Clear all current assistant messages from the view
- Cancel any outstanding messages
- Not start a new hydration process

#### History loading indicators

When using {@link PublicConfigMessaging.customLoadHistory}, the Carbon AI Chat automatically shows a fullscreen loading indicator during the hydration process. You do not need to manually control the loading state.

However, if you manually call {@link ChatInstanceMessaging.clearConversation} or {@link ChatInstanceMessaging.insertHistory} (for example, when switching conversations), you may want to show a loading indicator while fetching data:

```typescript
async function switchToConversation(conversationId: string) {
  // Show loading indicator
  instance.updateIsChatLoadingCounter("increase");

  try {
    // Fetch history from your backend
    const history = await fetchHistoryFromAPI(conversationId);

    // Clear current conversation and load new one
    await instance.messaging.clearConversation();
    await instance.messaging.insertHistory(history);
  } finally {
    // Hide loading indicator
    instance.updateIsChatLoadingCounter("decrease");
  }
}
```

{@link ChatInstance.updateIsChatLoadingCounter} controls the fullscreen hydration loading state. The indicator shows when the internal counter is greater than zero. Always pair "increase" with "decrease" to ensure proper cleanup.

#### Example history implementation

For a complete example, see the [history example](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/history).
