---
title: Message format
---

## Overview

Build the two payloads your server trades with Carbon AI Chat: the chat sends you a request, and your server returns a response. This page is for whoever writes the server, assistant, or API that builds those payloads. To wire the chat to that server in your host app, start with [Server communication](./CustomServer.md) and the delivery guides it links to.

When someone sends a message, the chat hands a {@link MessageRequest | request} to your {@link PublicConfigMessaging.customSendMessage | customSendMessage} function. Your code builds a {@link MessageResponse | response} and sends it back. Follow the links below to reach each type's full field reference.

## Requests

A {@link MessageRequest | request} is an outgoing user message. The fields you read most often:

- `input` ({@link MessageInput}) — the user input. `input.text` holds the typed or posted-back text. `input.structured_data` carries typed fields and uploaded files when present — see [Structured data](./StructuredData.md).
- `history` ({@link MessageRequestHistory}) — request metadata. `history.is_welcome_request` is `true` on the synthetic request the chat sends when a user first opens the chat (see [Welcome messages](./CustomServer.md#welcome-messages)).
- `context` — an opaque pass-through you can use to carry your own per-request data.

## Responses

A {@link MessageResponse | response} is what your server returns. Its core shape:

- `id` — a unique identifier for the response. When you stream, it must match the `response_id` on your chunks (see [Streaming](#streaming)). To update the message later, this is the key you pass to {@link ChatInstanceMessaging.upsertMessage | upsertMessage}.
- `output` ({@link MessageOutput}) — `output.generic` is an ordered array of response items, and each item is a {@link GenericItem | generic item}. Open that type to see its properties and every `response_type` it supports; those types ({@link MessageResponseTypes}) include text, image, button, card, user_defined, conversational search, and more.
- `message_options` ({@link MessageResponseOptions}) — message-level options such as `response_user_profile` and `reasoning`.
- `history` ({@link MessageResponseHistory}) — response metadata (timestamps, labels, error states, and feedback) that you persist and replay through [Conversation history](./CustomHistory.md).

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

## Streaming

The shapes above describe a complete message. To build a response piece by piece, wrap items in chunk envelopes and apply them one at a time. You can deliver a response two ways:

- [Adding messages (legacy)](./AddMessageChunk.md) — the current flow. It documents the full chunk reference: {@link StreamChunk}, {@link PartialItemChunk}, {@link CompleteItemChunk}, and {@link FinalResponseChunk}.
- [Adding messages (experimental)](./UpsertMessage.md) — the forward-thinking flow. You accumulate state in your app code and apply each update with one call, which sidesteps the chunk-shape contract.

Both render the same {@link MessageResponse | response} shape shown above.

## Related

- [Server communication](./CustomServer.md) — wire the chat to your server.
- [Structured data](./StructuredData.md) — send typed fields and uploaded files on the request.
- [Adding messages (legacy)](./AddMessageChunk.md) — deliver a response piece by piece.
- [Adding messages (experimental)](./UpsertMessage.md) — accumulate state and apply each update with one call.
- [Conversation history](./CustomHistory.md) — persist and replay responses.
