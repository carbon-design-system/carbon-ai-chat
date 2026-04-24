# Reasoning & Chain of Thought

Mocks four reasoning UX patterns — default reasoning steps, controlled reasoning steps, a single reasoning content trace, and chain-of-thought tool traces — behind a dropdown picker.

## What this example shows

- An initial `MessageResponseTypes.OPTION` dropdown (`OptionItemPreference.DROPDOWN`) that picks one of four mocked scenarios.
- Streaming reasoning steps via `addMessageChunk` with `ReasoningStep` / `ReasoningStepOpenState`.
- Controlled reasoning steps where all steps stay closed and a loading indicator is shown.
- A reasoning-content scenario: single long-form rationale trace streamed as one piece.
- A chain-of-thought scenario using `ChainOfThoughtStep` + `ChainOfThoughtStepStatus` to show tool request/response traces.
- Cancel handling via `CustomSendMessageOptions.signal`.

## When to use this pattern

- You want to compare the library's reasoning/chain-of-thought UIs before wiring them to a real model.
- You need a reference for streaming reasoning steps independently from the user-facing text.

## APIs and props demonstrated

| Symbol                                                      | Package / kind              | Role in this example                            |
| ----------------------------------------------------------- | --------------------------- | ----------------------------------------------- |
| `ChatContainer`                                             | `@carbon/ai-chat` component | Mounts the chat UI.                             |
| `PublicConfig`                                              | `@carbon/ai-chat` type      | Config shape.                                   |
| `customSendMessage`                                         | `messaging` prop            | Dispatches to scenario runners.                 |
| `MessageResponseTypes.TEXT` / `MessageResponseTypes.OPTION` | `@carbon/ai-chat`           | Welcome text + scenario picker.                 |
| `OptionItemPreference.DROPDOWN`                             | `@carbon/ai-chat` enum      | Renders scenario picker as a dropdown.          |
| `ReasoningStep` / `ReasoningStepOpenState`                  | `@carbon/ai-chat` types     | Reasoning step payloads and open-state control. |
| `ChainOfThoughtStep` / `ChainOfThoughtStepStatus`           | `@carbon/ai-chat` types     | Chain-of-thought tool traces.                   |
| `MessageResponseOptions`                                    | `@carbon/ai-chat` type      | `message_options` attached to partial chunks.   |
| `StreamChunk`                                               | `@carbon/ai-chat` type      | Chunk shape for streaming.                      |
| `instance.messaging.addMessage` / `addMessageChunk`         | `ChatInstance` API          | Emit welcome + streamed chunks.                 |
| `CustomSendMessageOptions.signal`                           | `@carbon/ai-chat`           | Abort signal for cancellation.                  |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-reasoning-and-chain-of-thought
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
