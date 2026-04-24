# History

`ChatContainer` with a `customLoadHistory` implementation and a manual "insert history" button that swaps in a randomly-sized conversation via `ChatInstance.messaging`.

## What this example shows

- Wiring `customLoadHistory` alongside `customSendMessage` under `messaging`.
- Capturing the `ChatInstance` in `onBeforeRender`.
- Programmatically loading and swapping conversations using `instance.messaging.clearConversation()` and `instance.messaging.insertHistory()`.
- Rendering user-defined responses through `renderUserDefinedResponse`.

## When to use this pattern

- You want to see how history payloads are shaped for `insertHistory`.
- You need to programmatically clear and inject conversations without the built-in history panel.

## APIs and props demonstrated

| Symbol                                 | Package / kind              | Role in this example                                  |
| -------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `ChatContainer`                        | `@carbon/ai-chat` component | Mounts the chat UI.                                   |
| `PublicConfig`                         | `@carbon/ai-chat` type      | Types the config.                                     |
| `ChatInstance`                         | `@carbon/ai-chat` type      | Captured in `onBeforeRender`, used to manage history. |
| `Button`                               | `@carbon/react` component   | Triggers a history re-injection.                      |
| `messaging.customSendMessage`          | config prop                 | Mock backend.                                         |
| `messaging.customLoadHistory`          | config prop                 | Mock history loader returning N messages.             |
| `onBeforeRender`                       | component prop              | Captures the chat instance.                           |
| `renderUserDefinedResponse`            | component prop              | Renders user-defined response content.                |
| `instance.messaging.clearConversation` | instance method             | Clears the current conversation.                      |
| `instance.messaging.insertHistory`     | instance method             | Inserts loaded history into the chat.                 |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-history
```

See [../README.md](../README.md) for the full setup walkthrough.
