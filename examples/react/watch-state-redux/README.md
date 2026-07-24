# Watch state (Redux Toolkit)

Mirrors `ChatInstance` state into a Redux Toolkit store via the `STATE_CHANGE` bus event so any component can read chat state through `useSelector`.

## What this example shows

- Bridging `BusEventType.STATE_CHANGE` into a Redux Toolkit slice with `dispatch`.
- Seeding the store from `instance.getState()` before any events fire.
- Reading mirrored state in components via a narrow, typed `useSelector` selector.
- Why the integration is one-way (chat → Redux) instead of Redux → chat.

## When to use this pattern

- Your application already uses Redux Toolkit and you want chat state available alongside the rest of your app state.
- You want components decoupled from the `ChatInstance` to read chat state via selectors.
- You want chat state visible in Redux DevTools alongside your other slices.

## APIs and props demonstrated

| Symbol                        | Package / kind              | Role in this example                                                  |
| ----------------------------- | --------------------------- | --------------------------------------------------------------------- |
| `ChatContainer`               | `@carbon/ai-chat` component | Mounts the chat UI as a float launcher.                               |
| `messaging.customSendMessage` | config prop                 | Mock backend.                                                         |
| `homescreen.isOn`             | config prop                 | Enables the homescreen so toggling it produces `STATE_CHANGE` events. |
| `homescreen.greeting`         | config prop                 | Greeting text on the homescreen.                                      |
| `homescreen.starters`         | config prop                 | Starter buttons.                                                      |
| `onBeforeRender`              | component prop              | Captures the `ChatInstance` and wires the bus → Redux bridge.         |
| `instance.getState`           | `@carbon/ai-chat` method    | Seeds the Redux store on first render.                                |
| `instance.on`                 | `@carbon/ai-chat` method    | Subscribes to `STATE_CHANGE`.                                         |
| `BusEventType.STATE_CHANGE`   | `@carbon/ai-chat` enum      | Event the bridge listens to.                                          |
| `PublicChatState`             | `@carbon/ai-chat` type      | Type of the snapshot stored in Redux.                                 |
| `configureStore`              | `@reduxjs/toolkit` function | Creates the Redux store.                                              |
| `createSlice`                 | `@reduxjs/toolkit` function | Defines the chat-state slice with the `chatStateSync` reducer.        |
| `Provider`                    | `react-redux` component     | Provides the store to the React tree.                                 |
| `useSelector` (typed)         | `react-redux` hook          | Reads `homeScreenState.isHomeScreenOpen` from the store.              |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-watch-state-redux
```

See [../README.md](../README.md) for the full setup walkthrough.
