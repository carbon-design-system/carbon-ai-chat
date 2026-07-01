# Upsert message / Reasoning with streaming generic items (web components)

Each reasoning step's `content` is a `GenericItem[]` — a `TextItem` whose `text` field is streamed token by token, followed by a `user_defined` summary card appended when the step finishes — all delivered through `upsertMessage`. The host app slots the summary card into the `cds-aichat-container` via the `USER_DEFINED_RESPONSE` bus event.

## What this example shows

- Setting `ReasoningStep.content` to an array of `GenericItem` instead of a markdown string.
- Streaming the inner `TextItem`'s `text` by re-sending the full `message_options.reasoning.steps` on each `upsertMessage` snapshot as it grows (the snapshot replaces the stored message rather than appending).
- Appending a `UserDefinedItem` (`response_type: "user_defined"`) onto that same array when the step is done.
- Listening for `BusEventType.USER_DEFINED_RESPONSE` to learn the slot name the chat created, then rendering a Lit template into that slot.

## When to use this pattern

- You want richer per-step content than markdown allows — e.g., a citation card, a small chart, or any custom Lit/web-component element — without leaving the reasoning step UI.
- You're streaming step bodies and want the same `streaming → finalize` flow you already use for the message body.

## APIs and props demonstrated

| Symbol                                                               | Package / kind            | Role in this example                                                            |
| -------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------- |
| `cds-aichat-container`                                               | `@carbon/ai-chat` element | Mounts the chat UI.                                                             |
| `PublicConfig`                                                       | `@carbon/ai-chat` type    | Config shape.                                                                   |
| `BusEventType.USER_DEFINED_RESPONSE` / `BusEventUserDefinedResponse` | `@carbon/ai-chat`         | Event the chat fires when a `user_defined` item needs a slot.                   |
| `ReasoningStep` with `content: GenericItem[]`                        | `@carbon/ai-chat` type    | Per-step array of inline response items.                                        |
| `MessageResponseTypes.TEXT` / `MessageResponseTypes.USER_DEFINED`    | `@carbon/ai-chat` enum    | Item kinds composed into the step's content array.                              |
| `UserDefinedItem`                                                    | `@carbon/ai-chat` type    | The appended summary card payload.                                              |
| `MessageResponseOptions` / `MessageResponse`                         | `@carbon/ai-chat` types   | Snapshot + `message_options` re-sent with updated `reasoning.steps` per upsert. |
| `MessageState`                                                       | `@carbon/ai-chat` enum    | `STREAMING` per update, `COMPLETE` on the final call.                           |
| `instance.messaging.upsertMessage` / `instance.on`                   | `ChatInstance` API        | Inserts + updates the welcome and steps in place; subscribe to slot events.     |
| `CustomSendMessageOptions.signal`                                    | `@carbon/ai-chat`         | Abort signal for cancellation.                                                  |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-upsert-message-reasoning-with-streaming-generic-items
```

See [../README.md](../README.md) for the full setup walkthrough.
