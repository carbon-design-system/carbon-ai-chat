# Custom header

Replaces the built-in chat header with a custom React element using `WriteableElementName.CUSTOM_HEADER`. The framework header is never mounted when this slot has content — there is no intermediate render where both are visible.

## What this example shows

- Replacing the built-in chat header by supplying a React element in `renderWriteableElements[WriteableElementName.CUSTOM_HEADER]`.

## When to use this pattern

- You want a header that matches your host application's design system rather than the built-in chat header.
- You need full control over header actions, branding, or navigation while keeping the chat conversation area.
- You are building a fullscreen or embedded chat where the host page already provides a header.

## APIs and props demonstrated

| Symbol | Package / kind | Role in this example |
| --- | --- | --- |
| `ChatCustomElement` | `@carbon/ai-chat` component | Mounts the chat into a host element you style. |
| `WriteableElementName.CUSTOM_HEADER` | `@carbon/ai-chat` enum value | Key for the header replacement slot. |
| `renderWriteableElements` | component prop | Map of slot names to React elements; `CUSTOM_HEADER` entry replaces the built-in header. |
| `messaging.customSendMessage` | config prop | Mock backend. |
| `layout.showFrame` | config prop | Disables the built-in frame for the fullscreen surface. |
| `openChatByDefault` | config prop | Opens the chat on mount. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-custom-header
```

See [../README.md](../README.md) for the full setup walkthrough.
