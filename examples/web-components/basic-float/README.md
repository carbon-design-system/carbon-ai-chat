# Basic / Float

Minimal Lit example of the float / launcher layout: mounts `<cds-aichat-container>` with a mock streaming `customSendMessage` backend. This is the canonical reference for the float chat shape.

## What this example shows

- Mounting the chat UI via `<cds-aichat-container>` with a `PublicConfig`.
- A mock `customSendMessage` that streams a response one word at a time using `addMessageChunk`.

## When to use this pattern

- You want a full-width, inline chat container driven by your own transport function.
- You need a starting point for sending and receiving streaming messages with a mock backend.

## APIs and props demonstrated

| Symbol                               | Kind           | Role in this example                                      |
| ------------------------------------ | -------------- | --------------------------------------------------------- |
| `<cds-aichat-container>`             | custom element | Mounts the chat UI.                                       |
| `messaging.customSendMessage`        | property       | Mock backend that streams a response.                     |
| `instance.messaging.addMessage`      | method         | Emits non-streaming responses (the welcome message).      |
| `instance.messaging.addMessageChunk` | method         | Streams partial / complete / final chunks back to the UI. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-basic-float
```

See [../README.md](../README.md) for the full setup walkthrough.
