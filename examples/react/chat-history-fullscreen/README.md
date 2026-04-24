# Chat History (Fullscreen)

`ChatCustomElement` configured as a full-screen host with the history feature enabled and a custom `historyPanelElement` for browsing conversations.

## What this example shows

- Hosting the chat in a full-screen `ChatCustomElement` with `layout.showFrame: false` and a max-width custom property.
- Enabling the built-in history panel via `history.isOn: true`.
- Reacting to `STATE_CHANGE` events to track `customPanels.history.isMobile` for responsive history UI.
- Rendering a custom history list into the `historyPanelElement` writeable element.
- Swapping conversations using `instance.messaging.clearConversation()` and `instance.messaging.insertHistory()`.

## When to use this pattern

- You want a full-screen chat experience (not a floating widget) with history browsing.
- You need a reference for responsive custom history panel UI.
- You need to host the chat inside your own element while keeping built-in history.

## APIs and props demonstrated

| Symbol                                        | Package / kind              | Role in this example                                  |
| --------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `ChatCustomElement`                           | `@carbon/ai-chat` component | Mounts the chat into a host element you style.        |
| `PublicConfig`                                | `@carbon/ai-chat` type      | Types the config passed to `ChatCustomElement`.       |
| `ChatInstance`                                | `@carbon/ai-chat` type      | Captured in `onBeforeRender`.                         |
| `BusEventType`                                | `@carbon/ai-chat` enum      | Subscribes to `STATE_CHANGE`.                         |
| `history.isOn`                                | config prop                 | Turns on the history panel.                           |
| `layout.showFrame`                            | config prop                 | Disables the chat frame so it fills the host.         |
| `layout.customProperties`                     | config prop                 | Sets `messages-max-width` for the full-screen layout. |
| `openChatByDefault`                           | config prop                 | Opens the chat automatically on mount.                |
| `messaging.customSendMessage`                 | config prop                 | Mock backend.                                         |
| `messaging.customLoadHistory`                 | config prop                 | Mock history loader.                                  |
| `className`                                   | component prop              | Host class name applied to the custom element.        |
| `onBeforeRender`                              | component prop              | Captures the instance and subscribes to state.        |
| `renderUserDefinedResponse`                   | component prop              | Renders user-defined response content.                |
| `renderWriteableElements.historyPanelElement` | component prop              | React node rendered into the history panel slot.      |
| `instance.getState`                           | instance method             | Reads `customPanels.history.isMobile`.                |
| `instance.messaging.clearConversation`        | instance method             | Clears the conversation before insertion.             |
| `instance.messaging.insertHistory`            | instance method             | Inserts the loaded history.                           |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-chat-history-fullscreen
```

See [../README.md](../README.md) for the full setup walkthrough.
