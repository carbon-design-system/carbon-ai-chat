# Watch State

Shows how to observe `ChatInstance` state externally by reading `instance.getState()` once and then subscribing to `BusEventType.STATE_CHANGE` to keep a parent React component in sync.

## What this example shows

- Calling `instance.getState()` in `onBeforeRender` to seed local React state.
- Subscribing to `BusEventType.STATE_CHANGE` and reacting to changes in `homeScreenState.isHomeScreenOpen` and `activeResponseId`.
- Rendering the current view ("Homescreen" vs "Chat View") outside the chat UI.
- Passing `activeResponseId` into a `renderUserDefinedResponseFactory` so user-defined responses can adapt to active-response state.
- A `homescreen` config block with starter buttons to drive view transitions.

## When to use this pattern

- You need to mirror chat state into your own UI (badges, side panels, headers).
- You want to react to transitions between homescreen and chat view.

## APIs and props demonstrated

| Symbol                                                            | Package / kind              | Role in this example                                        |
| ----------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------- |
| `ChatContainer`                                                   | `@carbon/ai-chat` component | Mounts the chat UI.                                         |
| `PublicConfig`                                                    | `@carbon/ai-chat` type      | Config shape (includes `homescreen`).                       |
| `ChatInstance`                                                    | `@carbon/ai-chat` type      | Provided in `onBeforeRender`.                               |
| `BusEventType.STATE_CHANGE`                                       | `@carbon/ai-chat` enum      | Event subscribed to.                                        |
| `instance.getState()` / `instance.on`                             | `ChatInstance` API          | Snapshot + subscription.                                    |
| `homescreen.isOn` / `homescreen.greeting` / `homescreen.starters` | config                      | Starter buttons that trigger state transitions.             |
| `customSendMessage`                                               | `messaging` prop            | Echoes text and emits a `user_defined` response on request. |
| `renderUserDefinedResponse`                                       | prop                        | Factory rebuilt per `activeResponseId` via `useMemo`.       |
| `MessageResponseTypes.USER_DEFINED`                               | `@carbon/ai-chat`           | Emitted by the mock backend.                                |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-watch-state
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
