# Chain of thought

Mocks a chain-of-thought tool trace: the assistant ships a complete `chain_of_thought` array on the final response, and the chat renders a drawer where each step's `request`, `response`, and `status` are inspectable.

## What this example shows

- Attaching a `chain_of_thought` array to a `final_response.message_options` so the chat surfaces a tool-trace drawer.
- Modeling each `ChainOfThoughtStep` with `tool_name`, `request`, `response`, and a `ChainOfThoughtStepStatus` badge.
- Cancel handling via `CustomSendMessageOptions.signal`.

## When to use this pattern

- You want a raw debugging view of tool calls (semantic search, summarize, generate, etc.) rather than the user-friendly reasoning-step UX.
- Your backend already produces structured tool-call traces and you want to surface them without further transformation.

## APIs and props demonstrated

| Symbol                                              | Package / kind              | Role in this example                           |
| --------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| `ChatCustomElement`                                 | `@carbon/ai-chat` component | Mounts the chat UI.                            |
| `PublicConfig`                                      | `@carbon/ai-chat` type      | Config shape.                                  |
| `customSendMessage`                                 | `messaging` prop            | Runs the chain-of-thought scenario.            |
| `ChainOfThoughtStep` / `ChainOfThoughtStepStatus`   | `@carbon/ai-chat` types     | Tool-trace payloads + status badge values.     |
| `MessageResponseOptions`                            | `@carbon/ai-chat` type      | `message_options` carrying `chain_of_thought`. |
| `StreamChunk`                                       | `@carbon/ai-chat` type      | Chunk shape for streaming.                     |
| `instance.messaging.addMessage` / `addMessageChunk` | `ChatInstance` API          | Emit welcome + final response.                 |
| `CustomSendMessageOptions.signal`                   | `@carbon/ai-chat`           | Abort signal for cancellation.                 |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-chain-of-thought
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
