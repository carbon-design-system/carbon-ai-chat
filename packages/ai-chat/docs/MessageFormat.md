---
title: Message format
---

### Overview

Build the payloads your server exchanges with Carbon AI Chat: the request the chat sends you and the response it expects back. This page is aimed at the author of the server, assistant, or API that produces those payloads. If you are wiring the chat up to that server in your host application, start with [Server communication](./CustomServer.md) and the delivery guides it links to.

When someone sends a message, the chat hands your {@link PublicConfigMessaging.customSendMessage} function a {@link MessageRequest}. Your code is responsible for producing a {@link MessageResponse} and delivering it back to the chat. You can navigate the full field-level reference for every type from the linked symbols below.

### Requests

A {@link MessageRequest} represents an outgoing user message. The fields you most commonly read:

- `input` ({@link MessageInput}) — the user input. `input.text` holds the typed (or posted-back) text. `input.structured_data` carries typed fields and uploaded files when present — see [Structured data](./StructuredData.md).
- `history` ({@link MessageRequestHistory}) — request metadata. `history.is_welcome_request` is `true` for the synthetic request the chat sends when a user first opens the chat (see [Welcome messages](./CustomServer.md#welcome-messages)).
- `context` — an opaque pass-through you can use to carry your own per-request data.

### Responses

A {@link MessageResponse} is what your server returns. Its core shape:

- `id` — a unique identifier for the response. When you stream, this must match the `response_id` carried on your chunks (see [Streaming](#streaming)). When you update a message later, it is the key you pass to {@link ChatInstanceMessaging.upsertMessage}.
- `output` ({@link MessageOutput}) — `output.generic` is an ordered array of response items. Each item is a {@link GenericItem}; navigate that type to see every supported `response_type` ({@link MessageResponseTypes}) — text, image, button, card, user_defined, conversational search, and more — and its properties.
- `message_options` ({@link MessageResponseOptions}) — message-level options such as `response_user_profile` and `chain_of_thought`.
- `history` ({@link MessageResponseHistory}) — response metadata (timestamps, labels, error states, feedback) that you persist and replay through [Conversation history](./CustomHistory.md).

A minimal response looks like this:

```typescript
const response: MessageResponse = {
  id: responseID,
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: "Hello! How can I help?",
      },
    ],
  },
};
```

### Streaming

The shapes above describe a complete message. When you produce a response incrementally, you wrap items in chunk envelopes and apply them one at a time. There are two delivery mechanisms:

- [Adding messages (legacy)](./AddMessageChunk.md) — the current flow. Documents the full chunk reference: {@link StreamChunk}, {@link PartialItemChunk}, {@link CompleteItemChunk}, and {@link FinalResponseChunk}.
- [Adding messages (experimental)](./UpsertMessage.md) — the forward-thinking flow. You accumulate state in app code and apply each update with a single call, sidestepping the chunk-shape contract.

Both ultimately render the same {@link MessageResponse} shape described above.

### Related

- [Server communication](./CustomServer.md) — wire the chat to your server.
- [Structured data](./StructuredData.md) — send typed fields and uploaded files on the request.
- [Adding messages (legacy)](./AddMessageChunk.md) — deliver a response incrementally.
- [Adding messages (experimental)](./UpsertMessage.md) — accumulate state and apply each update with one call.
- [Conversation history](./CustomHistory.md) — persist and replay responses.
