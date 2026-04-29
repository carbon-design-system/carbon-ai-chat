# Frameworks / React 17

Runs `ChatContainer` on React 17 using the legacy `ReactDOM.render` root, proving the library still works on the pre-concurrent API.

## What this example shows

- Mounting with `ReactDOM.render` (not `createRoot`).
- A minimal mock `customSendMessage` that echoes user input.

## When to use this pattern

- Your host app is stuck on React 17 and cannot upgrade yet.
- You want a reference for mounting Carbon AI Chat under the legacy React 17 API.

## APIs and props demonstrated

| Symbol              | Package / kind              | Role in this example       |
| ------------------- | --------------------------- | -------------------------- |
| `ChatContainer`     | `@carbon/ai-chat` component | Mounts the chat UI.        |
| `PublicConfig`      | `@carbon/ai-chat` type      | Config shape.              |
| `customSendMessage` | `messaging` prop            | Minimal echo mock backend. |
| `ReactDOM.render`   | `react-dom`                 | Legacy React 17 mount.     |

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
