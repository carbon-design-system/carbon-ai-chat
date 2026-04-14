# watsonx.ai

Connects `ChatContainer` to IBM watsonx.ai for real streaming text generation, using a small Express proxy to handle IAM auth and CORS.

## What this example shows

- A `customSendMessage` that streams from watsonx.ai via Server-Sent Events using `@microsoft/fetch-event-source`.
- A local Express proxy (`server.js`) that mints IAM access tokens and forwards the streaming request (`/api/token`, `/api/watsonx/stream`).
- Token-boundary buffering on the client so markdown structure survives across SSE chunks.
- Emitting `partial_item`, `complete_item`, and `final_response` chunks via `instance.messaging.addMessageChunk`.
- Reading watsonx credentials (`WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`, `WATSONX_MODEL_ID`) from `.env`.

## When to use this pattern

- You are integrating watsonx.ai streaming into a Carbon AI Chat UI.
- You need a minimal reference for an SSE-based `customSendMessage` with real auth.

## APIs and props demonstrated

| Symbol                                                      | Package / kind                  | Role in this example                   |
| ----------------------------------------------------------- | ------------------------------- | -------------------------------------- |
| `ChatContainer`                                             | `@carbon/ai-chat` component     | Mounts the chat UI.                    |
| `PublicConfig`                                              | `@carbon/ai-chat` type          | Config shape.                          |
| `customSendMessage`                                         | `messaging` prop                | Streams from watsonx.ai via SSE proxy. |
| `MessageRequest`, `MessageResponse`, `MessageResponseTypes` | `@carbon/ai-chat`               | Request/response shapes.               |
| `PartialItemChunkWithId`                                    | `@carbon/ai-chat` type          | Streaming chunk shape.                 |
| `instance.messaging.addMessage` / `addMessageChunk`         | `ChatInstance` API              | Welcome + streamed chunks.             |
| `fetchEventSource`                                          | `@microsoft/fetch-event-source` | SSE client.                            |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

This example additionally requires an IBM Cloud API key, a watsonx.ai project ID, and a populated `.env` (`WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`, optionally `WATSONX_MODEL_ID`). See the IBM Cloud and watsonx.ai consoles to obtain these values.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-watsonx
```

The `start` script runs both the Express proxy (`start:server`) and the webpack dev server (`start:client`) via `concurrently`.

See [../README.md](../README.md) for the full setup walkthrough.
