<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ChatInstanceMessaging

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ChatInstanceMessaging.html

Messaging actions for a chat instance.

## Signature

```ts
interface ChatInstanceMessaging
```

## Members

### addMessage

`addMessage: (message: MessageResponse) => Promise<void>`

Instructs the widget to process the given message as an incoming message received from the assistant. This will
fire a "pre:receive" event immediately and a "receive" event after the event has been processed by the widget.

This is the legacy way to add a message. It's fully supported and not deprecated, and there are no plans to
remove it. For new work, especially more complex UI that updates a message after it renders, use
ChatInstanceMessaging.upsertMessage. Nothing stops you from mixing the two flows, but it isn't
recommended or fully tested.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ChatInstanceMessaging.html#addmessage)

### addMessageChunk

`addMessageChunk: (chunk: StreamChunk) => Promise<void>`

Adds a streaming message chunk to the chat widget.

This is the legacy way to stream a message. It's fully supported and not deprecated, and there are no plans to
remove it. For new work, especially more complex UI, use ChatInstanceMessaging.upsertMessage. You build
up the message in your app and apply each update with one call, instead of matching the StreamChunk
shapes. Nothing stops you from mixing the two flows, but it isn't recommended or fully tested.

A chunk stream whose `customSendMessage` throws, or that is canceled before a
`final_response` chunk arrives, will have its `streamingState.isDone` settled to
`true` on the items streamed so far. The host is responsible for calling
`cancelCurrentMessageRequest` (or letting the chat cancel on restart) to settle
the stream; simply stopping calls to `addMessageChunk` without canceling leaves
`streamingState.isDone` as `false` indefinitely.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ChatInstanceMessaging.html#addmessagechunk)

### clearConversation

`clearConversation: () => Promise<void>`

Clears the current conversation. This will trigger a restart of the conversation but will not start a new
conversation (hydration). It will also clear any loading indicators UNLESS you have set
PublicConfigMessaging.messageLoadingIndicatorTimeoutSecs to 0.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ChatInstanceMessaging.html#clearconversation)

### insertHistory

`insertHistory: (messages: HistoryItem[]) => Promise<void>`

Inserts the given messages into the chat window as part of the chat history. This will fire the history:begin
and history:end events.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ChatInstanceMessaging.html#inserthistory)

### removeMessages

`removeMessages: (messageIDs: string[]) => Promise<void>`

Removes the messages with the given IDs from the chat view.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ChatInstanceMessaging.html#removemessages)

### restartConversation

`restartConversation: () => Promise<void>`

Restarts the conversation with the assistant. This does not make any changes to a conversation with a human agent.
This will clear all the current assistant messages from the main assistant view and cancel any outstanding
messages. It will also clear any loading indicators UNLESS you have set
PublicConfigMessaging.messageLoadingIndicatorTimeoutSecs to 0.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ChatInstanceMessaging.html#restartconversation)

### upsertMessage

`upsertMessage: (messageID: string, state: MessageState, updater: UpsertMessageUpdater) => Promise<void>`

Inserts or updates a single message identified by `messageID`. The `updater` receives
the MessageResponse currently stored under `messageID` (or `undefined` when no
message with that ID exists) and returns the message that should replace it.

This is the recommended way to add messages for new work, especially more complex UI. One
method covers inserting, streaming, correcting, and regenerating a message.
ChatInstanceMessaging.addMessage and ChatInstanceMessaging.addMessageChunk
remain fully supported as the legacy flow, and there are no plans to remove them. Nothing
stops you from mixing the two flows, but it isn't recommended or fully tested.

Calls targeting the same `messageID` are serialized — each call awaits the previous
call for that ID before running. Calls targeting different `messageID`s run
independently.

The `state` argument describes the MessageState the chat records for this
message after the upsert completes; it is applied uniformly to every item in the
returned message. Carbon AI Chat fires BusEventType.PRE_RECEIVE and
BusEventType.RECEIVE exactly when this call transitions the message into
MessageState.COMPLETE from any other state, including the case where the
message did not previously exist. STREAMING-to-STREAMING and COMPLETE-to-COMPLETE
upserts do not fire these events.

If the returned message has no `id`, Carbon AI Chat assigns `messageID`. The
cancellation contract for outbound messages is unchanged — see
CustomSendMessageOptions.

## Examples

```ts
await instance.messaging.upsertMessage('welcome', MessageState.COMPLETE, () => ({
  id: 'welcome',
  output: {
    generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Hi! How can I help?' }],
  },
}));
// The message shows, and the chat fires pre:receive and receive once.
```

```ts
// Inside customSendMessage(request, options, instance).
// streamAnswer stands in for your own async iterable of text pieces.
const messageID = `${request.id}-reply`;
const toMessage = (text: string): MessageResponse => ({
  id: messageID,
  request_id: request.id,
  output: {
    generic: [
      { response_type: MessageResponseTypes.TEXT, text, streaming_metadata: { id: 'answer' } },
    ],
  },
});

let text = '';
for await (const piece of streamAnswer(request)) {
  text += piece;
  await instance.messaging.upsertMessage(messageID, MessageState.STREAMING, () => toMessage(text));
}
await instance.messaging.upsertMessage(messageID, MessageState.COMPLETE, () => toMessage(text));
// receive fires once, on the final call.
```

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.ChatInstanceMessaging.html#upsertmessage)
