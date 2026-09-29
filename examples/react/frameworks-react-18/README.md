# Frameworks / React 18

Runs `ChatContainer` and `ChatCustomElement` on React 18, mounted from the app's own `createRoot`.

## What this example shows

- Mounting with `createRoot` from `react-dom/client`.
- Both React components: the floating `ChatContainer` at `/`, and `ChatCustomElement` in a sized element at `/?wrapper=custom`.
- A minimal mock `customSendMessage` that echoes user input.

## When to use this pattern

- Your host app runs React 18 and has not moved to React 19.
- You want a reference for mounting Carbon AI Chat under the React 18 root API.

## APIs and props demonstrated

| Symbol | Package / kind | Role in this example |
| --- | --- | --- |
| `ChatContainer` | `@carbon/ai-chat` component | Mounts the floating chat UI. |
| `ChatCustomElement` | `@carbon/ai-chat` component | Mounts the chat in a sized element. |
| `PublicConfig` | `@carbon/ai-chat` type | Config shape. |
| `customSendMessage` | `messaging` prop | Minimal echo mock backend. |
| `createRoot` | `react-dom/client` | React 18 mount. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-18
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
