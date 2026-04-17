# History

Demonstrates one-shot conversation rehydration: a button clears the active conversation and re-seeds it with a random-length history returned by `customLoadHistory`.

## What this example shows

- Supplying a `customLoadHistory` function on `<cds-aichat-container>` alongside `customSendMessage`.
- Triggering a reload via `instance.messaging.clearConversation()` followed by `instance.messaging.insertHistory()`.
- Logging the last loaded message id and its `activeResponseId` relationship.
- Rendering `user_defined` responses through `renderUserDefinedResponse` and keeping them in sync via the `STATE_CHANGE` bus event.

## When to use this pattern

- You need to rehydrate the chat from your own storage or server, without exposing a full history-picker UI.
- You want the default floating container layout.

## APIs and props demonstrated

| Symbol                                 | Kind           | Role in this example                                              |
| -------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `<cds-aichat-container>`               | custom element | Mounts the chat UI.                                               |
| `messaging.customSendMessage`          | property       | Mock backend for outbound messages.                               |
| `messaging.customLoadHistory`          | property       | Returns a synthetic `HistoryItem[]` of random length.             |
| `onBeforeRender`                       | property       | Captures the `ChatInstance` and subscribes to bus events.         |
| `renderUserDefinedResponse`            | property       | Callback returning an `HTMLElement` for `user_defined` responses. |
| `BusEventType.STATE_CHANGE`            | event          | Tracks `activeResponseId`.                                        |
| `instance.messaging.clearConversation` | method         | Resets the current conversation before reinserting history.       |
| `instance.messaging.insertHistory`     | method         | Rehydrates the chat with the loaded items.                        |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-history
```

See [../README.md](../README.md) for the full setup walkthrough.
