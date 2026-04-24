# Human Agent

Wires a mock service desk into `<cds-aichat-container>` via `serviceDeskFactory`, showing how to hand off from bot to human and how to swap the factory reference when user data changes.

## What this example shows

- Providing a `serviceDeskFactory` that returns a `MockServiceDesk` instance capturing the current user snapshot.
- Triggering a factory rebuild when user data changes (a simulated login after 5 seconds) and calling out that this resets any active human-agent chat.
- Using `customSendMessage` to drive the bot side of the conversation and hand off to the service desk on cue.
- Explaining the trade-off between swapping factories dynamically and deferring render until user data is known.

## When to use this pattern

- You need bot-to-human handoff through the Carbon AI Chat service-desk protocol.
- You are integrating with a service desk provider and want a reference `ServiceDesk` implementation.

## APIs and props demonstrated

| Symbol                         | Kind           | Role in this example                                                         |
| ------------------------------ | -------------- | ---------------------------------------------------------------------------- |
| `<cds-aichat-container>`       | custom element | Mounts the chat UI.                                                          |
| `messaging.customSendMessage`  | property       | Mock backend that routes between bot replies and desk handoff.               |
| `serviceDeskFactory`           | property       | Async factory returning a `MockServiceDesk`; rebuilt when user data changes. |
| `ServiceDeskFactoryParameters` | type           | Parameters passed to each factory call.                                      |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-human-agent
```

See [../README.md](../README.md) for the full setup walkthrough.
