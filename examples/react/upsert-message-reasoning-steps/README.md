# Upsert message / Reasoning steps

Mocks two reasoning-streaming patterns — discrete `ReasoningStep` items (the default behavior) and a single long-form `reasoning.content` trace — picked from a dropdown on the welcome message, all delivered through `upsertMessage`.

## What this example shows

- An initial `MessageResponseTypes.OPTION` dropdown (`OptionItemPreference.DROPDOWN`) that picks one of two reasoning scenarios.
- Streaming reasoning steps via `upsertMessage` with `ReasoningStep` items so the chat auto-opens the active step while the model is thinking — each update returns a full `MessageResponse` snapshot under a stable `messageID`.
- Streaming a single long-form `reasoning.content` trace as an alternative to discrete steps.
- Accumulating the streamed text locally and re-sending `reasoning.steps` / `reasoning.content` on every upsert (the snapshot replaces the stored message rather than appending), then a final `MessageState.COMPLETE` upsert so the trace persists in history.
- Cancel handling via `CustomSendMessageOptions.signal`.

## When to use this pattern

- Your backend emits reasoning either as discrete steps or as a long-form trace, and you want to preview both UX options.
- You need a reference for streaming the `reasoning.steps` and `reasoning.content` payloads independently from the user-facing text via `upsertMessage`.

## APIs and props demonstrated

| Symbol                             | Package / kind              | Role in this example                                               |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| `ChatCustomElement`                | `@carbon/ai-chat` component | Mounts the chat UI.                                                |
| `PublicConfig`                     | `@carbon/ai-chat` type      | Config shape.                                                      |
| `customSendMessage`                | `messaging` prop            | Dispatches to scenario runners.                                    |
| `MessageResponseTypes.OPTION`      | `@carbon/ai-chat`           | Welcome-message scenario picker.                                   |
| `OptionItemPreference.DROPDOWN`    | `@carbon/ai-chat` enum      | Renders scenario picker as a dropdown.                             |
| `ReasoningStep`                    | `@carbon/ai-chat` type      | Individual reasoning step payload.                                 |
| `MessageResponseOptions`           | `@carbon/ai-chat` type      | `message_options` carrying `reasoning.{steps,content}`.            |
| `MessageResponse`                  | `@carbon/ai-chat` type      | Full snapshot returned by each upsert updater.                     |
| `MessageState`                     | `@carbon/ai-chat` enum      | `STREAMING` per update, `COMPLETE` on the final call.              |
| `instance.messaging.upsertMessage` | `ChatInstance` API          | Inserts + updates the welcome and the streamed reasoning in place. |
| `CustomSendMessageOptions.signal`  | `@carbon/ai-chat`           | Abort signal for cancellation.                                     |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-upsert-message-reasoning-steps
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
