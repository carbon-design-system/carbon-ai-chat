# Watch / State (Redux Toolkit)

Selects one public chat state field into Redux Toolkit so any component can read it through `useSelector`.

## What this example shows

- Seeding the store from `instance.state.get()` before changes occur.
- Selecting `homeScreenState.isHomeScreenOpen` with `instance.state.select()`.
- Stopping the selection when the host unmounts or replaces the chat.
- Reading mirrored state in components via a narrow, typed `useSelector` selector.
- Why the integration is one-way (chat → Redux) instead of Redux → chat.

## When to use this pattern

- Your application already uses Redux Toolkit and you want chat state available alongside the rest of your app state.
- You want components decoupled from the `ChatInstance` to read chat state via selectors.
- You want chat state visible in Redux DevTools alongside your other slices.

## APIs and props demonstrated

| Symbol | Package / kind | Role in this example |
| --- | --- | --- |
| `ChatContainer` | `@carbon/ai-chat` component | Mounts the chat UI as a float launcher. |
| `messaging.customSendMessage` | config prop | Mock backend. |
| `homescreen.isOn` | config prop | Gives the selected field a visible state change. |
| `homescreen.greeting` | config prop | Greeting text on the homescreen. |
| `homescreen.starters` | config prop | Starter buttons. |
| `onBeforeRender` | component prop | Captures the `ChatInstance` and wires the state selection. |
| `instance.state.get()` | `ChatInstance` method | Seeds the Redux value. |
| `instance.state.select()` | `ChatInstance` method | Dispatches when the selected value changes. |
| `configureStore` | `@reduxjs/toolkit` function | Creates the Redux store. |
| `createSlice` | `@reduxjs/toolkit` function | Defines the selected chat-state slice. |
| `Provider` | `react-redux` component | Provides the store to the React tree. |
| `useSelector` (typed) | `react-redux` hook | Reads `homeScreenState.isHomeScreenOpen` from the store. |

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
