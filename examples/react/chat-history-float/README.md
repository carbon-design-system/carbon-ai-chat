# Chat History (Float)

`ChatContainer` with the history feature enabled, using the writeable `historyPanelElement` slot to render a custom conversation picker in the default float layout.

## What this example shows

- Turning on the built-in history panel via `history.isOn: true`.
- Wiring `customLoadHistory` alongside `customSendMessage` under `messaging`.
- Rendering a custom history panel UI into the `historyPanelElement` writeable element.
- Using `instance.messaging.clearConversation()` + `instance.messaging.insertHistory()` to swap conversations from the UI.
- Rendering user-defined responses via `renderUserDefinedResponse`.

## When to use this pattern

- You want a floating chat widget that lets users browse and restore past conversations.
- You need a reference for mounting React content inside a chat writeable element slot.
- You need an example of programmatic conversation replacement through `ChatInstance`.

## APIs and props demonstrated

| Symbol                                        | Package / kind              | Role in this example                                         |
| --------------------------------------------- | --------------------------- | ------------------------------------------------------------ |
| `ChatContainer`                               | `@carbon/ai-chat` component | Mounts the chat UI in the default float layout.              |
| `PublicConfig`                                | `@carbon/ai-chat` type      | Types the config passed to `ChatContainer`.                  |
| `ChatInstance`                                | `@carbon/ai-chat` type      | Captured in `onBeforeRender` and used to swap conversations. |
| `history.isOn`                                | config prop                 | Enables the built-in history panel.                          |
| `messaging.customSendMessage`                 | config prop                 | Mock backend.                                                |
| `messaging.customLoadHistory`                 | config prop                 | Returns a mock history payload for a selected conversation.  |
| `onBeforeRender`                              | component prop              | Captures the `ChatInstance`.                                 |
| `renderUserDefinedResponse`                   | component prop              | Renders user-defined response content.                       |
| `renderWriteableElements.historyPanelElement` | component prop              | React node rendered into the history panel slot.             |
| `instance.messaging.clearConversation`        | instance method             | Clears the current conversation before inserting history.    |
| `instance.messaging.insertHistory`            | instance method             | Inserts the loaded history payload.                          |

## Chat history configuration

For information on how to set up chat history view the [chat-history-fullscreen/README.md](../chat-history-fullscreen/README.md) guide.

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-chat-history-float
```

See [../README.md](../README.md) for the full setup walkthrough.
