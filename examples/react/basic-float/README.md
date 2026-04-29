# Basic / Float

Minimal React example of the float / launcher layout: mounts `ChatContainer` with a mock streaming backend. This is the canonical reference for the float chat shape.

## What this example shows

- Mounting `ChatContainer` with a `PublicConfig` object defined outside the component to avoid re-mount churn.
- Implementing a mock backend via `customSendMessage` that streams a response one word at a time using `addMessageChunk`.

## When to use this pattern

- You want the simplest possible starting point for a React + Carbon AI Chat app.
- You need a reference for sending and receiving streaming messages with a mock backend.

## APIs and props demonstrated

| Symbol                               | Package / kind              | Role in this example                                      |
| ------------------------------------ | --------------------------- | --------------------------------------------------------- |
| `ChatContainer`                      | `@carbon/ai-chat` component | Mounts the chat UI.                                       |
| `PublicConfig`                       | `@carbon/ai-chat` type      | Types the config object passed to `ChatContainer`.        |
| `messaging.customSendMessage`        | config prop                 | Mock backend that streams a response.                     |
| `instance.messaging.addMessage`      | instance method             | Emits non-streaming responses (the welcome message).      |
| `instance.messaging.addMessageChunk` | instance method             | Streams partial / complete / final chunks back to the UI. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-basic-float
```

See [../README.md](../README.md) for the full setup walkthrough.
