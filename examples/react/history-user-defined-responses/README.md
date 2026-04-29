# History / User-defined responses

React example that rehydrates a conversation containing multiple `user_defined` cards via `customLoadHistory` + `insertHistory`, then uses `instance.getState()` and `BusEventType.STATE_CHANGE` to highlight only the most-recent card as active.

## What this example shows

- Pre-loading a transcript of three `user_defined` cards through `customLoadHistory` and `instance.messaging.insertHistory`.
- Auto-rehydrating in `onBeforeRender` (no host button) by pairing `clearConversation` with `insertHistory`.
- Reading the initial `activeResponseId` from `instance.getState()` and keeping it in sync via `BusEventType.STATE_CHANGE`.
- Threading `activeResponseId` through a memoized `renderUserDefinedResponse` factory so each rendered card knows whether it is the most-recent message.
- Sending a new `user_defined` message live and watching the active highlight move from the previous active card to the new one.

## When to use this pattern

- You rehydrate conversations that contain host-rendered `user_defined` cards and need an "active/latest" flag for custom UI on those cards.
- You want to verify that `STATE_CHANGE` wiring stays correct after `insertHistory`, not just after live `customSendMessage` traffic.
- You want a single active highlight across many simultaneously-visible custom cards.

## APIs and props demonstrated

| Symbol                                 | Package / kind              | Role in this example                                                                     |
| -------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| `ChatCustomElement`                    | `@carbon/ai-chat` component | Mounts the chat as a fullscreen surface.                                                 |
| `PublicConfig.layout.showFrame`        | config prop                 | Disables the default frame so the host element fills its container.                      |
| `PublicConfig.openChatByDefault`       | config prop                 | Opens the chat on first paint so the rehydrated cards are immediately visible.           |
| `messaging.customSendMessage`          | config prop                 | Mock backend that emits a new `user_defined` response on the `user_defined` keyword.     |
| `messaging.customLoadHistory`          | config prop                 | Mock history loader that returns three pre-built `user_defined` cards.                   |
| `instance.messaging.clearConversation` | instance method             | Clears the conversation before `insertHistory` so the transcript fully replaces.         |
| `instance.messaging.insertHistory`     | instance method             | Inserts the rehydrated `HistoryItem[]` produced by `customLoadHistory`.                  |
| `renderUserDefinedResponse`            | component prop              | Returns a React component for `user_defined` items.                                      |
| `RenderUserDefinedState`               | `@carbon/ai-chat` type      | Argument to the render function — exposes `messageItem` and `fullMessage`.               |
| `BusEventType.STATE_CHANGE`            | `@carbon/ai-chat` enum      | Notifies on `activeResponseId` changes, including the change emitted by `insertHistory`. |
| `instance.getState`                    | instance method             | Reads the initial `activeResponseId` before any `STATE_CHANGE` events fire.              |
| `instance.on`                          | instance method             | Subscribes the `STATE_CHANGE` handler.                                                   |
| `MessageResponseTypes.USER_DEFINED`    | `@carbon/ai-chat` enum      | Response-type discriminator that routes the message to the render handler.               |
| `MessageInputType.TEXT`                | `@carbon/ai-chat` enum      | Marks each fabricated user-request `HistoryItem` as a text input.                        |
| `HistoryItem`                          | `@carbon/ai-chat` type      | Wrapper produced by `customLoadHistory` for each rehydrated message.                     |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-history-user-defined-responses
```

See [../README.md](../README.md) for the full setup walkthrough.
