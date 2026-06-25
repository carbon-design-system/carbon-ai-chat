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

| Symbol                             | Kind           | Role in this example                                               |
| ---------------------------------- | -------------- | ------------------------------------------------------------------ |
| `<cds-aichat-custom-element>`      | custom element | Mounts the chat UI.                                                |
| `messaging.customSendMessage`      | property       | Dispatches to the two reasoning scenario runners.                  |
| `onBeforeRender`                   | property       | Captures the `ChatInstance`.                                       |
| `MessageResponseTypes.OPTION`      | enum value     | Welcome-message scenario picker.                                   |
| `OptionItemPreference.DROPDOWN`    | enum value     | Renders scenario picker as a dropdown.                             |
| `ReasoningStep`                    | type           | Individual reasoning step payload.                                 |
| `MessageResponseOptions`           | type           | `message_options` carrying `reasoning.{steps,content}`.            |
| `MessageResponse`                  | type           | Full snapshot returned by each upsert updater.                     |
| `MessageState`                     | enum value     | `STREAMING` per update, `COMPLETE` on the final call.              |
| `instance.messaging.upsertMessage` | API            | Inserts + updates the welcome and the streamed reasoning in place. |
| `ChatInstance`                     | type           | Type of the instance handle.                                       |
| `PublicConfig`                     | type           | Types the chat configuration object.                               |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-upsert-message-reasoning-steps
```

See [../README.md](../README.md) for the full setup walkthrough.
