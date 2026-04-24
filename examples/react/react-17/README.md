# React 17

Runs `ChatContainer` on React 17 using the legacy `ReactDOM.render` root, proving the library still works on the pre-concurrent API.

## What this example shows

- Mounting with `ReactDOM.render` (not `createRoot`).
- Subscribing to `BusEventType.STATE_CHANGE` and `BusEventType.FEEDBACK` via `instance.on` in `onBeforeRender`.
- Tracking `activeResponseId` in local React state and feeding it into a `renderUserDefinedResponseFactory`.
- Mocked streaming (`stream text`), plain text, and `user_defined` responses via `customSendMessage`, including stream-cancel handling via `AbortSignal`.
- Reading feedback submissions (`FeedbackInteractionType.SUBMITTED`) and alerting the payload.

## When to use this pattern

- Your host app is stuck on React 17 and cannot upgrade yet.
- You want a reference for the same feature set (streaming, feedback, user-defined responses) used in React 18/19 examples.

## APIs and props demonstrated

| Symbol                                                          | Package / kind              | Role in this example                         |
| --------------------------------------------------------------- | --------------------------- | -------------------------------------------- |
| `ChatContainer`                                                 | `@carbon/ai-chat` component | Mounts the chat UI.                          |
| `PublicConfig`                                                  | `@carbon/ai-chat` type      | Config shape.                                |
| `ChatInstance`                                                  | `@carbon/ai-chat` type      | Provided via `onBeforeRender`.               |
| `BusEventType.STATE_CHANGE` / `BusEventType.FEEDBACK`           | `@carbon/ai-chat`           | Events subscribed to.                        |
| `FeedbackInteractionType.SUBMITTED`                             | `@carbon/ai-chat` enum      | Branch inside the feedback handler.          |
| `instance.getState()` / `instance.on`                           | `ChatInstance` API          | Initial state snapshot + subscriptions.      |
| `customSendMessage`                                             | `messaging` prop            | Mock streaming backend.                      |
| `MessageResponseTypes`, `StreamChunk`, `PartialItemChunkWithId` | `@carbon/ai-chat` types     | Stream chunk shapes.                         |
| `renderUserDefinedResponse`                                     | prop                        | Factory variant keyed on `activeResponseId`. |
| `onBeforeRender`                                                | prop                        | Wires state + feedback listeners.            |
| `ReactDOM.render`                                               | `react-dom`                 | Legacy React 17 mount.                       |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-17
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
