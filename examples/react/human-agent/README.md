# Human Agent

`ChatContainer` wired to a mock service desk via `serviceDeskFactory`, demonstrating how to hand off to a live agent while keeping the factory stable across re-renders.

## What this example shows

- Providing a `serviceDeskFactory` that returns a `MockServiceDesk` implementing the `ServiceDesk` interface.
- Using `useMemo` to keep the factory reference stable (because changing it tears down active agent sessions).
- Passing runtime user data into the factory so the `MockServiceDesk` can identify the user.
- Integrating service desk hand-off with a standard `customSendMessage` mock backend.

## When to use this pattern

- You need a template for wiring Carbon AI Chat to a live-agent / service desk backend.
- You have runtime-dependent factory parameters (e.g., user ID) and need a safe memoization pattern.

## APIs and props demonstrated

| Symbol                                                                  | Package / kind              | Role in this example                                        |
| ----------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------- |
| `ChatContainer`                                                         | `@carbon/ai-chat` component | Mounts the chat UI.                                         |
| `PublicConfig`                                                          | `@carbon/ai-chat` type      | Types the config.                                           |
| `ServiceDesk`                                                           | `@carbon/ai-chat` interface | Contract implemented by `MockServiceDesk`.                  |
| `ServiceDeskFactoryParameters`                                          | `@carbon/ai-chat` type      | Parameters passed to the factory.                           |
| `ServiceDeskCallback`                                                   | `@carbon/ai-chat` type      | Used by `MockServiceDesk` to send updates back to the chat. |
| `ChatInstance`                                                          | `@carbon/ai-chat` type      | Used by the mock service desk.                              |
| `MessageResponseTypes` / `UserType` / `ErrorType` / `AgentAvailability` | `@carbon/ai-chat` enums     | Used inside the mock service desk.                          |
| `messaging.customSendMessage`                                           | config prop                 | Mock backend.                                               |
| `serviceDeskFactory`                                                    | config prop                 | Returns a live-agent service desk instance.                 |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-human-agent
```

See [../README.md](../README.md) for the full setup walkthrough.
