# Custom Element

Full-screen chat driven by `<cds-aichat-custom-element>`, letting the host element control size and frame instead of the built-in floating container.

## What this example shows

- Mounting `<cds-aichat-custom-element>` sized to 100vw/100vh for a fullscreen layout.
- Disabling the default frame with `layout.showFrame: false` and overriding a CSS custom property via `layout.customProperties`.
- Opening the chat automatically with `openChatByDefault: true`.
- Wiring a mock `customSendMessage` and `injectCarbonTheme`.

## When to use this pattern

- You need the chat to occupy a host-controlled region rather than a floating widget.
- You want to tune internal CSS custom properties (for example, `messages-max-width`) via `layout.customProperties`.

## APIs and props demonstrated

| Symbol                        | Kind           | Role in this example                                           |
| ----------------------------- | -------------- | -------------------------------------------------------------- |
| `<cds-aichat-custom-element>` | custom element | Hosts the chat UI at the size of its CSS box.                  |
| `messaging.customSendMessage` | property       | Mock backend that echoes user input.                           |
| `layout.showFrame`            | property       | Disables the built-in frame.                                   |
| `layout.customProperties`     | property       | Overrides internal CSS variables (e.g., `messages-max-width`). |
| `openChatByDefault`           | property       | Opens the main window on mount.                                |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-custom-element
```

See [../README.md](../README.md) for the full setup walkthrough.
