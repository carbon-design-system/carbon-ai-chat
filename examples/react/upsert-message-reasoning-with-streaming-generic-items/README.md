# Upsert message / Reasoning with streaming generic items

Each reasoning step's `content` is a `GenericItem[]` — a `TextItem` whose `text` field is streamed token by token, followed by a `user_defined` summary card appended when the step finishes — all delivered through `upsertMessage`.

## What this example shows

- Setting `ReasoningStep.content` to an array of `GenericItem` instead of a markdown string.
- Streaming the inner `TextItem`'s `text` by re-sending the full `message_options.reasoning.steps` on each `upsertMessage` snapshot as it grows (the snapshot replaces the stored message rather than appending).
- Appending a `UserDefinedItem` (`response_type: "user_defined"`) onto that same array when the step is done.
- Rendering the appended user_defined item through the `renderUserDefinedResponse` callback so it appears inside the reasoning step.

## When to use this pattern

- You want richer per-step content than markdown allows — e.g., a citation card, a small chart, or any custom React component — without leaving the reasoning step UI.
- You're streaming step bodies and want the same `streaming → finalize` flow you already use for the message body.

## APIs and props demonstrated

| Symbol                                                            | Package / kind              | Role in this example                                                            |
| ----------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------- |
| `ChatContainer`                                                   | `@carbon/ai-chat` component | Mounts the chat UI.                                                             |
| `PublicConfig`                                                    | `@carbon/ai-chat` type      | Config shape.                                                                   |
| `renderUserDefinedResponse`                                       | `ChatContainer` prop        | Renders the `user_defined` summary card inside each reasoning step.             |
| `RenderUserDefinedState`                                          | `@carbon/ai-chat` type      | Callback argument shape.                                                        |
| `ReasoningStep` with `content: GenericItem[]`                     | `@carbon/ai-chat` type      | Per-step array of inline response items.                                        |
| `MessageResponseTypes.TEXT` / `MessageResponseTypes.USER_DEFINED` | `@carbon/ai-chat` enum      | Item kinds composed into the step's content array.                              |
| `UserDefinedItem`                                                 | `@carbon/ai-chat` type      | The appended summary card payload.                                              |
| `MessageResponseOptions` / `MessageResponse`                      | `@carbon/ai-chat` types     | Snapshot + `message_options` re-sent with updated `reasoning.steps` per upsert. |
| `MessageState`                                                    | `@carbon/ai-chat` enum      | `STREAMING` per update, `COMPLETE` on the final call.                           |
| `instance.messaging.upsertMessage`                                | `ChatInstance` API          | Inserts + updates the welcome and the streamed steps in place.                  |
| `CustomSendMessageOptions.signal`                                 | `@carbon/ai-chat`           | Abort signal for cancellation.                                                  |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-upsert-message-reasoning-with-streaming-generic-items
```

See [../README.md](../README.md) for the full setup walkthrough.
