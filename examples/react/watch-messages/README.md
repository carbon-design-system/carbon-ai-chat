# Watch / Messages

Shows how to select public messages and conversation status into React while a controlled response streams.

## What this example shows

- Seeding messages and status from `instance.state.get()` in `onBeforeRender`.
- Updating separate React values with focused `instance.state.select()` calls.
- Reading partial content from the immutable public messages list.
- Recording submitted, streaming, and ready status changes without a live region.
- Stopping each selection when the host unmounts or replaces the chat.

## When to use this pattern

- You need to show a transcript summary or progress outside the chat.
- Your host uses React state and does not need another state library.
- You need a narrow view of chat state that updates during streaming.

## APIs and props demonstrated

| Symbol | Package / kind | Role in example |
| --- | --- | --- |
| `ChatContainer` | `@carbon/ai-chat` component | Mounts the chat UI as a float launcher. |
| `instance.state.get()` | `ChatInstance` method | Seeds messages and status. |
| `instance.state.select()` | `ChatInstance` method | Updates messages and status separately. |
| `PublicChatState.messages` | `@carbon/ai-chat` state field | Supplies the public transcript. |
| `PublicChatState.status` | `@carbon/ai-chat` state field | Supplies the current conversation phase. |
| `instance.messaging.upsertMessage()` | `ChatInstance` method | Publishes partial and complete response snapshots. |
| `MessageState` | `@carbon/ai-chat` enum | Marks the response as streaming or complete. |

## Run it

Build the core packages first. From the repository root:

```bash
npm install
npm run aiChat:build
npm run start --workspace=@carbon/ai-chat-examples-react-watch-messages
```

See [../README.md](../README.md) for the full setup walkthrough.
