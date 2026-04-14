# Custom Element

Full-screen `ChatCustomElement` integration that hosts the chat inside your own element with the frame disabled.

## What this example shows

- Mounting `ChatCustomElement` instead of `ChatContainer` to control the host element's layout.
- Disabling the chat frame via `layout.showFrame: false` so the host CSS drives the size.
- Opening the chat automatically with `openChatByDefault`.
- Wiring a mock backend through `customSendMessage`.

## When to use this pattern

- You want the chat to occupy a custom slot in your page layout rather than float.
- You need direct control over the chat host element's sizing and styling.
- You are building a full-screen chat UI.

## APIs and props demonstrated

| Symbol                        | Package / kind              | Role in this example                            |
| ----------------------------- | --------------------------- | ----------------------------------------------- |
| `ChatCustomElement`           | `@carbon/ai-chat` component | Mounts the chat into a host element you style.  |
| `PublicConfig`                | `@carbon/ai-chat` type      | Types the config passed to `ChatCustomElement`. |
| `messaging.customSendMessage` | config prop                 | Mock backend.                                   |
| `layout.showFrame`            | config prop                 | Disables the built-in frame.                    |
| `openChatByDefault`           | config prop                 | Opens the chat on mount.                        |
| `className`                   | component prop              | Host class applied to the custom element.       |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-custom-element
```

See [../README.md](../README.md) for the full setup walkthrough.
