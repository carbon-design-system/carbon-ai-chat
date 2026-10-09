# Watch / Messages (Redux Toolkit)

Shows how to select public messages and conversation status into Redux Toolkit while a controlled response streams.

## What this example shows

- Seeding a narrow Redux slice from `instance.state.get()` in `onBeforeRender`.
- Dispatching messages and status through separate `instance.state.select()` calls.
- Reading partial content through typed `useSelector` hooks.
- Recording submitted, streaming, and ready status changes without a live region.
- Stopping each selection when the host unmounts or replaces the chat.

## When to use this pattern

- Your host already uses Redux Toolkit for shared application state.
- Components without a `ChatInstance` reference need transcript or progress data.
- You want to mirror only the chat values that your host renders.

## APIs and props demonstrated

| Symbol | Package / kind | Role in example |
| --- | --- | --- |
| `ChatContainer` | `@carbon/ai-chat` component | Mounts the chat UI as a float launcher. |
| `instance.state.get()` | `ChatInstance` method | Seeds messages and status. |
| `instance.state.select()` | `ChatInstance` method | Dispatches messages and status separately. |
| `PublicChatState.messages` | `@carbon/ai-chat` state field | Supplies the public transcript. |
| `PublicChatState.status` | `@carbon/ai-chat` state field | Supplies the current conversation phase. |
| `configureStore` | `@reduxjs/toolkit` function | Creates the narrow host store. |
| `createSlice` | `@reduxjs/toolkit` function | Defines messages and status actions. |
| `useSelector` (typed) | `react-redux` hook | Reads mirrored values in the host panel. |
| `instance.messaging.upsertMessage()` | `ChatInstance` method | Publishes partial and complete response snapshots. |

## Run it

Build the core packages first. From the repository root:

```bash
npm install
npm run aiChat:build
npm run start --workspace=@carbon/ai-chat-examples-react-watch-messages-redux
```

See [../README.md](../README.md) for the full setup walkthrough.
