# Chat History (Float Layout)

Float-layout chat that exposes a custom history panel slot backed by `customLoadHistory`, letting users switch between saved conversations.

## What this example shows

- Enabling the built-in history feature with `history.isOn: true` on `<cds-aichat-container>`.
- Supplying a `customLoadHistory` function alongside `customSendMessage` in `messaging`.
- Rendering a custom history panel into the `historyPanelElement` writeable-element slot via `<history-writeable-element-example>`.
- Loading a named conversation by calling `instance.messaging.clearConversation()` followed by `instance.messaging.insertHistory()` when the slot dispatches `history-panel-load-chat`.
- Rendering `user_defined` responses through the `USER_DEFINED_RESPONSE` bus event and mapping each one to its dynamic slot.

## When to use this pattern

- You need a floating chat (the default container layout) with a curated list of prior conversations.
- You want to show how writeable-element slots can host app-owned UI beside the chat.

## APIs and props demonstrated

| Symbol                                 | Kind           | Role in this example                                             |
| -------------------------------------- | -------------- | ---------------------------------------------------------------- |
| `<cds-aichat-container>`               | custom element | Mounts the chat UI in float layout.                              |
| `config.history.isOn`                  | property       | Enables the built-in history panel.                              |
| `messaging.customSendMessage`          | property       | Mock backend for outbound messages.                              |
| `messaging.customLoadHistory`          | property       | Returns stored `HistoryItem[]` for a named conversation.         |
| `onBeforeRender`                       | property       | Captures the `ChatInstance` and subscribes to bus events.        |
| `BusEventType.USER_DEFINED_RESPONSE`   | event          | Populates a slot map for dynamic Lit rendering.                  |
| `instance.messaging.clearConversation` | method         | Resets the current conversation before inserting history.        |
| `instance.messaging.insertHistory`     | method         | Rehydrates the chat with loaded history.                         |
| `historyPanelElement`                  | slot           | Writeable-element slot hosting the custom history panel.         |
| `history-panel-load-chat`              | custom event   | Dispatched by the slot element when a user picks a conversation. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-chat-history-float
```

See [../README.md](../README.md) for the full setup walkthrough.
