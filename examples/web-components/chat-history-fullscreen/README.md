# Chat History (Fullscreen Layout)

Fullscreen chat driven by `<cds-aichat-custom-element>` that exposes a custom history panel slot backed by `customLoadHistory`.

## What this example shows

- Mounting `<cds-aichat-custom-element>` at 100vw/100vh as a fullscreen shell with `layout.showFrame: false` and `openChatByDefault: true`.
- Enabling the built-in history feature with `history.isOn: true`.
- Supplying `customLoadHistory` alongside `customSendMessage` in `messaging`.
- Rendering a custom history panel into the `historyPanelElement` writeable-element slot via `<history-writeable-element-example>`.
- Reacting to `history-panel-load-chat` events on the host element to `clearConversation()` and `insertHistory()`.
- Tracking `customPanels.history.isMobile` through the `STATE_CHANGE` bus event to adapt the slot UI.

## When to use this pattern

- You want a fullscreen chat surface (not a floating widget) with app-owned history navigation.
- You need to control the outer frame/layout yourself via the `<cds-aichat-custom-element>` host.

## APIs and props demonstrated

| Symbol                                 | Kind           | Role in this example                                      |
| -------------------------------------- | -------------- | --------------------------------------------------------- |
| `<cds-aichat-custom-element>`          | custom element | Hosts the chat UI at the size of its host container.      |
| `config.history.isOn`                  | property       | Enables the built-in history panel.                       |
| `config.layout.showFrame`              | property       | Removes the default frame for fullscreen presentation.    |
| `config.openChatByDefault`             | property       | Opens the main window on mount.                           |
| `messaging.customSendMessage`          | property       | Mock backend for outbound messages.                       |
| `messaging.customLoadHistory`          | property       | Returns stored `HistoryItem[]` for a named conversation.  |
| `onBeforeRender`                       | property       | Captures the `ChatInstance` and subscribes to bus events. |
| `BusEventType.USER_DEFINED_RESPONSE`   | event          | Populates a slot map for dynamic Lit rendering.           |
| `BusEventType.STATE_CHANGE`            | event          | Tracks `customPanels.history.isMobile`.                   |
| `instance.messaging.clearConversation` | method         | Resets the current conversation before inserting history. |
| `instance.messaging.insertHistory`     | method         | Rehydrates the chat with loaded history.                  |
| `historyPanelElement`                  | slot           | Writeable-element slot hosting the custom history panel.  |
| `history-panel-load-chat`              | custom event   | Listened for on the host element to drive the loader.     |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-chat-history-fullscreen
```

See [../README.md](../README.md) for the full setup walkthrough.
